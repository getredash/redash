import time
import datetime
import logging
import redis
from celery import Task
from celery.result import AsyncResult
from celery.utils.log import get_task_logger
from redash import redis_connection, models, statsd_client
from redash.utils import gen_query_hash
from redash.worker import celery
from redash.data.query_runner import get_query_runner

logger = get_task_logger(__name__)


class BaseTask(Task):
    abstract = True

    def after_return(self, *args, **kwargs):
        models.db.close_db(None)

    def __call__(self, *args, **kwargs):
        models.db.connect_db()
        return super(BaseTask, self).__call__(*args, **kwargs)


class QueryTask(object):
    MAX_RETRIES = 5

    # TODO: this is mapping to the old Job class statuses. Need to update the client side and remove this
    STATUSES = {
        'PENDING': 1,
        'STARTED': 2,
        'SUCCESS': 3,
        'FAILURE': 4,
        'REVOKED': 4
    }

    def __init__(self, job_id=None, async_result=None):
        if async_result:
            self._async_result = async_result
        else:
            self._async_result = AsyncResult(job_id, app=celery)

    @property
    def id(self):
        return self._async_result.id

    @classmethod
    def add_task(cls, query, data_source, scheduled=False):
        query_hash = gen_query_hash(query)
        logging.info("[Manager][%s] Inserting job", query_hash)
        try_count = 0
        job = None

        while try_count < cls.MAX_RETRIES:
            try_count += 1

            pipe = redis_connection.pipeline()
            try:
                pipe.watch(cls._job_lock_id(query_hash, data_source.id))
                job_id = pipe.get(cls._job_lock_id(query_hash, data_source.id))
                if job_id:
                    logging.info("[Manager][%s] Found existing job: %s", query_hash, job_id)

                    job = cls(job_id=job_id)
                else:
                    pipe.multi()

                    if scheduled:
                        queue_name = data_source.scheduled_queue_name
                    else:
                        queue_name = data_source.queue_name

                    result = execute_query.apply_async(args=(query, data_source.id), queue=queue_name)
                    job = cls(async_result=result)
                    logging.info("[Manager][%s] Created new job: %s", query_hash, job.id)
                    pipe.set(cls._job_lock_id(query_hash, data_source.id), job.id)
                    pipe.execute()
                break

            except redis.WatchError:
                continue

        if not job:
            logging.error("[Manager][%s] Failed adding job for query.", query_hash)

        return job

    def to_dict(self):
        if self._async_result.status == 'STARTED':
            updated_at = self._async_result.result.get('start_time', 0)
        else:
            updated_at = 0

        if self._async_result.failed() and isinstance(self._async_result.result, Exception):
            error = self._async_result.result.message
        elif self._async_result.status == 'REVOKED':
            error = 'Query execution cancelled.'
        else:
            error = ''

        if self._async_result.successful():
            query_result_id = self._async_result.result
        else:
            query_result_id = None

        return {
            'id': self._async_result.id,
            'updated_at': updated_at,
            'status': self.STATUSES[self._async_result.status],
            'error': error,
            'query_result_id': query_result_id,
        }

    def cancel(self):
        return self._async_result.revoke(terminate=True)

    @staticmethod
    def _job_lock_id(query_hash, data_source_id):
        return "query_hash_job:%s:%s" % (data_source_id, query_hash)


@celery.task(base=BaseTask)
def refresh_queries():
    # self.status['last_refresh_at'] = time.time()
    # self._save_status()

    logger.info("Refreshing queries...")

    outdated_queries_count = 0
    for query in models.Query.outdated_queries():
        # TODO: this should go into lower priority
        QueryTask.add_task(query.query, query.data_source, scheduled=True)
        outdated_queries_count += 1

    statsd_client.gauge('manager.outdated_queries', outdated_queries_count)
    # TODO: decide if we still need this
    # statsd_client.gauge('manager.queue_size', self.redis_connection.zcard('jobs'))

    logger.info("Done refreshing queries. Found %d outdated queries." % outdated_queries_count)

    status = redis_connection.hgetall('redash:status')
    now = time.time()

    redis_connection.hmset('redash:status', {
        'outdated_queries_count': outdated_queries_count,
        'last_refresh_at': now
    })

    statsd_client.gauge('manager.seconds_since_refresh', now - float(status.get('last_refresh_at', now)))


@celery.task(bind=True, base=BaseTask, track_started=True)
def execute_query(self, query, data_source_id):
    # TODO: maybe this should be a class?
    start_time = time.time()

    logger.info("Loading data source (%d)...", data_source_id)

    # TODO: we should probably cache data sources in Redis
    data_source = models.DataSource.get_by_id(data_source_id)

    self.update_state(state='STARTED', meta={'start_time': start_time, 'custom_message': ''})

    logger.info("Executing query:\n%s", query)

    query_hash = gen_query_hash(query)
    query_runner = get_query_runner(data_source.type, data_source.options)

    if getattr(query_runner, 'annotate_query', True):
        # TODO: anotate with queu ename
        annotated_query = "/* Task Id: %s, Query hash: %s */ %s" % \
                          (self.request.id, query_hash, query)
    else:
        annotated_query = query

    with statsd_client.timer('query_runner.{}.{}.run_time'.format(data_source.type, data_source.name)):
        data, error = query_runner(annotated_query)

    run_time = time.time() - start_time
    logger.info("Query finished... data length=%s, error=%s", data and len(data), error)

    self.update_state(state='STARTED', meta={'start_time': start_time, 'error': error, 'custom_message': ''})

    # Delete query_hash
    redis_connection.delete(QueryTask._job_lock_id(query_hash, data_source.id))

    # TODO: it is possible that storing the data will fail, and we will need to retry
    # while we already marked the job as done
    if not error:
        query_result = models.QueryResult.store_result(data_source.id, query_hash, query, data, run_time, datetime.datetime.utcnow())
    else:
        raise Exception(error)

    return query_result.id

