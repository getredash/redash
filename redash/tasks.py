import time
import datetime
from celery.utils.log import get_task_logger
import peewee
import logging
from celery.result import AsyncResult
import redis
from redash.data.query_runner import get_query_runner
from redash import celery, redis_connection, models, statsd_client
from redash.utils import gen_query_hash

logger = get_task_logger(__name__)


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
    def add_task(cls, query, data_source):
        query_hash = gen_query_hash(query)
        logging.info("[Manager][%s] Inserting job", query_hash)
        try_count = 0
        job = None

        while try_count < cls.MAX_RETRIES:
            try_count += 1

            pipe = redis_connection.pipeline()
            try:
                pipe.watch('query_hash_job:%s' % query_hash)
                job_id = pipe.get('query_hash_job:%s' % query_hash)
                if job_id:
                    logging.info("[Manager][%s] Found existing job: %s", query_hash, job_id)

                    job = Job(job_id=job_id)
                else:
                    pipe.multi()
                    job = Job(async_result=execute_query.delay(query, data_source.id))
                    logging.info("[Manager][%s] Created new job: %s", query_hash, job.id)
                    pipe.set('query_hash_job:%s' % query_hash, job.id)
                break

            except redis.WatchError:
                continue

        if not job:
            logging.error("[Manager][%s] Failed adding job for query.", query_hash)

        return job

    def to_dict(self):
        if self._async_result.status == 'STARTED':
            updated_at = self._async_result.result['start_time']
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


def refresh_queries():
    # TODO: this will only execute scheduled queries that were executed before. I think this is
    # a reasonable assumption, but worth revisiting.

    # TODO: move this logic to the model.
    outdated_queries = models.Query.select(peewee.Func('first_value', models.Query.id)\
        .over(partition_by=[models.Query.query_hash, models.Query.data_source]))\
        .join(models.QueryResult)\
        .where(models.Query.ttl > 0,
               (models.QueryResult.retrieved_at +
                (models.Query.ttl * peewee.SQL("interval '1 second'"))) <
               peewee.SQL("(now() at time zone 'utc')"))

    queries = models.Query.select(models.Query, models.DataSource).join(models.DataSource)\
        .where(models.Query.id << outdated_queries)

    # self.status['last_refresh_at'] = time.time()
    # self._save_status()

    logger.info("Refreshing queries...")

    outdated_queries_count = 0
    for query in queries:
        # TODO: this should go into lower priority
        QueryTask.add_task(query.query, query.data_source)
        outdated_queries_count += 1

    statsd_client.gauge('manager.outdated_queries', outdated_queries_count)
    # statsd_client.gauge('manager.queue_size', self.redis_connection.zcard('jobs'))

    logger.info("Done refreshing queries... %d" % outdated_queries_count)

    # def report_status(self):
    #     manager_status = self.redis_connection.hgetall('manager:status')
    #     self.statsd_client.gauge('manager.seconds_since_refresh',
    #                              time.time() - float(manager_status['last_refresh_at']))
    #
    # def _save_status(self):
    #     self.redis_connection.hmset('manager:status', self.status)


@celery.task(bind=True, track_started=True)
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

    # TODO: it is possible that storing the data will fail, and we will need to retry
    # while we already marked the job as done
    # Delete query_hash
    redis_connection.delete('query_hash_job:%s', query_hash)

    if not error:
        query_result = models.QueryResult.store_result(data_source.id, query_hash, query, data, run_time, datetime.datetime.utcnow())
    else:
        raise Exception(error)

    return query_result.id

