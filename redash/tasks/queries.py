import json
import time
import logging
import signal
import redis
from celery.result import AsyncResult
from celery.utils.log import get_task_logger
from redash import redis_connection, models, statsd_client, settings, utils
from redash.utils import gen_query_hash
from redash.worker import celery
from redash.query_runner import InterruptException
from .alerts import check_alerts_for_query

logger = get_task_logger(__name__)


def _job_lock_id(query_hash, data_source_id):
    return "query_hash_job:%s:%s" % (data_source_id, query_hash)


def _unlock(query_hash, data_source_id):
    redis_connection.delete(_job_lock_id(query_hash, data_source_id))


# TODO:
# There is some duplication between this class and QueryTask, but I wanted to implement the monitoring features without
# much changes to the existing code, so ended up creating another object. In the future we can merge them.
class QueryTaskTracker(object):
    DONE_LIST = 'query_task_trackers:done'
    WAITING_LIST = 'query_task_trackers:waiting'
    IN_PROGRESS_LIST = 'query_task_trackers:in_progress'
    ALL_LISTS = (DONE_LIST, WAITING_LIST, IN_PROGRESS_LIST)

    def __init__(self, data):
        self.data = data

    @classmethod
    def create(cls, task_id, state, query_hash, data_source_id, scheduled, metadata):
        data = dict(task_id=task_id, state=state,
                    query_hash=query_hash, data_source_id=data_source_id,
                    scheduled=scheduled,
                    username=metadata.get('Username', 'unknown'),
                    query_id=metadata.get('Query ID', 'unknown'),
                    retries=0,
                    scheduled_retries=0,
                    created_at=time.time(),
                    started_at=None,
                    run_time=None)

        return cls(data)

    def save(self, connection=None):
        if connection is None:
            connection = redis_connection

        self.data['updated_at'] = time.time()
        key_name = self._key_name(self.data['task_id'])
        connection.set(key_name, utils.json_dumps(self.data))
        connection.zadd(self._get_list(), time.time(), key_name)

        for l in self.ALL_LISTS:
            if l != self._get_list():
                connection.zrem(l, key_name)

    # TOOD: this is not thread/concurrency safe. In current code this is not an issue, but better to fix this.
    def update(self, **kwargs):
        self.data.update(kwargs)
        self.save()

    @staticmethod
    def _key_name(task_id):
        return 'query_task_tracker:{}'.format(task_id)

    def _get_list(self):
        if self.state in ('finished', 'failed', 'cancelled'):
            return self.DONE_LIST

        if self.state in ('created'):
            return self.WAITING_LIST

        return self.IN_PROGRESS_LIST

    @classmethod
    def get_by_task_id(cls, task_id, connection=None):
        if connection is None:
            connection = redis_connection

        key_name = cls._key_name(task_id)
        data = connection.get(key_name)
        return cls.create_from_data(data)

    @classmethod
    def create_from_data(cls, data):
        if data:
            data = json.loads(data)
            return cls(data)

        return None

    @classmethod
    def all(cls, list_name, offset=0, limit=-1):
        if limit != -1:
            limit -= 1

        if offset != 0:
            offset -= 1

        ids = redis_connection.zrevrange(list_name, offset, limit)
        pipe = redis_connection.pipeline()
        for id in ids:
            pipe.get(id)

        tasks = [cls.create_from_data(data) for data in pipe.execute()]
        return tasks

    @classmethod
    def prune(cls, list_name, keep_count):
        count = redis_connection.zcard(list_name)
        if count <= keep_count:
            return 0

        remove_count = count - keep_count
        keys = redis_connection.zrange(list_name, 0, remove_count - 1)
        redis_connection.delete(*keys)
        redis_connection.zremrangebyrank(list_name, 0, remove_count - 1)

        return remove_count

    def __getattr__(self, item):
        return self.data[item]

    def __contains__(self, item):
        return item in self.data


class QueryTask(object):
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

    def to_dict(self):
        if self._async_result.status == 'STARTED':
            updated_at = self._async_result.result.get('start_time', 0)
        else:
            updated_at = 0

        status = self.STATUSES[self._async_result.status]

        if isinstance(self._async_result.result, Exception):
            error = self._async_result.result.message
            status = 4
        elif self._async_result.status == 'REVOKED':
            error = 'Query execution cancelled.'
        else:
            error = ''

        if self._async_result.successful() and not error:
            query_result_id = self._async_result.result
        else:
            query_result_id = None

        return {
            'id': self._async_result.id,
            'updated_at': updated_at,
            'status': status,
            'error': error,
            'query_result_id': query_result_id,
        }

    @property
    def is_cancelled(self):
        return self._async_result.status == 'REVOKED'

    @property
    def celery_status(self):
        return self._async_result.status

    def ready(self):
        return self._async_result.ready()

    def cancel(self):
        return self._async_result.revoke(terminate=True, signal='SIGINT')


def enqueue_query(query, data_source, user_id, scheduled=False, metadata={}):
    query_hash = gen_query_hash(query)
    logging.info("Inserting job for %s with metadata=%s", query_hash, metadata)
    try_count = 0
    job = None

    while try_count < 5:
        try_count += 1

        pipe = redis_connection.pipeline()
        try:
            pipe.watch(_job_lock_id(query_hash, data_source.id))
            job_id = pipe.get(_job_lock_id(query_hash, data_source.id))
            if job_id:
                logging.info("[%s] Found existing job: %s", query_hash, job_id)

                job = QueryTask(job_id=job_id)

                if job.ready():
                    logging.info("[%s] job found is ready (%s), removing lock", query_hash, job.celery_status)
                    redis_connection.delete(_job_lock_id(query_hash, data_source.id))
                    job = None

            if not job:
                pipe.multi()

                if scheduled:
                    queue_name = data_source.scheduled_queue_name
                else:
                    queue_name = data_source.queue_name

                result = execute_query.apply_async(args=(query, data_source.id, metadata, user_id), queue=queue_name)
                job = QueryTask(async_result=result)
                tracker = QueryTaskTracker.create(result.id, 'created', query_hash, data_source.id, scheduled, metadata)
                tracker.save(connection=pipe)

                logging.info("[%s] Created new job: %s", query_hash, job.id)
                pipe.set(_job_lock_id(query_hash, data_source.id), job.id, settings.JOB_EXPIRY_TIME)
                pipe.execute()
            break

        except redis.WatchError:
            continue

    if not job:
        logging.error("[Manager][%s] Failed adding job for query.", query_hash)

    return job


@celery.task(name="redash.tasks.refresh_queries")
def refresh_queries():
    logger.info("Refreshing queries...")

    outdated_queries_count = 0
    query_ids = []

    with statsd_client.timer('manager.outdated_queries_lookup'):
        for query in models.Query.outdated_queries():
            if settings.FEATURE_DISABLE_REFRESH_QUERIES: 
                logging.info("Disabled refresh queries.")
            elif query.data_source.paused:
                logging.info("Skipping refresh of %s because datasource - %s is paused (%s).", query.id, query.data_source.name, query.data_source.pause_reason)
            else:
                enqueue_query(query.query_text, query.data_source, query.user_id,
                              scheduled=True,
                              metadata={'Query ID': query.id, 'Username': 'Scheduled'})

            query_ids.append(query.id)
            outdated_queries_count += 1

    statsd_client.gauge('manager.outdated_queries', outdated_queries_count)

    logger.info("Done refreshing queries. Found %d outdated queries: %s" % (outdated_queries_count, query_ids))

    status = redis_connection.hgetall('redash:status')
    now = time.time()

    redis_connection.hmset('redash:status', {
        'outdated_queries_count': outdated_queries_count,
        'last_refresh_at': now,
        'query_ids': json.dumps(query_ids)
    })

    statsd_client.gauge('manager.seconds_since_refresh', now - float(status.get('last_refresh_at', now)))


@celery.task(name="redash.tasks.cleanup_tasks")
def cleanup_tasks():
    in_progress = QueryTaskTracker.all(QueryTaskTracker.IN_PROGRESS_LIST)
    for tracker in in_progress:
        result = AsyncResult(tracker.task_id)

        # If the AsyncResult status is PENDING it means there is no celery task object for this tracker, and we can
        # mark it as "dead":
        if result.status == 'PENDING':
            logging.info("In progress tracker for %s is no longer enqueued, cancelling (task: %s).",
                         tracker.query_hash, tracker.task_id)
            _unlock(tracker.query_hash, tracker.data_source_id)
            tracker.update(state='cancelled')

        if result.ready():
            logging.info("in progress tracker %s finished", tracker.query_hash)
            _unlock(tracker.query_hash, tracker.data_source_id)
            tracker.update(state='finished')

    waiting = QueryTaskTracker.all(QueryTaskTracker.WAITING_LIST)
    for tracker in waiting:
        result = AsyncResult(tracker.task_id)

        if result.ready():
            logging.info("waiting tracker %s finished", tracker.query_hash)
            _unlock(tracker.query_hash, tracker.data_source_id)
            tracker.update(state='finished')

    # Maintain constant size of the finished tasks list:
    QueryTaskTracker.prune(QueryTaskTracker.DONE_LIST, 1000)


@celery.task(name="redash.tasks.cleanup_query_results")
def cleanup_query_results():
    """
    Job to cleanup unused query results -- such that no query links to them anymore, and older than
    settings.QUERY_RESULTS_MAX_AGE (a week by default, so it's less likely to be open in someone's browser and be used).

    Each time the job deletes only settings.QUERY_RESULTS_CLEANUP_COUNT (100 by default) query results so it won't choke
    the database in case of many such results.
    """

    logging.info("Running query results clean up (removing maximum of %d unused results, that are %d days old or more)",
                 settings.QUERY_RESULTS_CLEANUP_COUNT, settings.QUERY_RESULTS_CLEANUP_MAX_AGE)

    unused_query_results = models.QueryResult.unused(settings.QUERY_RESULTS_CLEANUP_MAX_AGE).limit(settings.QUERY_RESULTS_CLEANUP_COUNT)
    deleted_count = models.QueryResult.query.filter(
        models.QueryResult.id.in_(unused_query_results.subquery())
    ).delete(synchronize_session=False)
    models.db.session.commit()
    logger.info("Deleted %d unused query results.", deleted_count)


@celery.task(name="redash.tasks.refresh_schemas")
def refresh_schemas():
    """
    Refreshes the data sources schemas.
    """

    blacklist = [int(ds_id) for ds_id in redis_connection.smembers('data_sources:schema:blacklist') if ds_id]

    global_start_time = time.time()

    logger.info(u"task=refresh_schemas state=start")

    for ds in models.DataSource.query:
        if ds.paused:
            logger.info(u"task=refresh_schema state=skip ds_id=%s reason=paused(%s)", ds.id, ds.pause_reason)
        elif ds.id in blacklist:
            logger.info(u"task=refresh_schema state=skip ds_id=%s reason=blacklist", ds.id)
        else:
            logger.info(u"task=refresh_schema state=start ds_id=%s", ds.id)
            start_time = time.time()
            try:
                ds.get_schema(refresh=True)
                logger.info(u"task=refresh_schema state=finished ds_id=%s runtime=%.2f", ds.id, time.time() - start_time)
            except Exception:
                logger.exception(u"Failed refreshing schema for the data source: %s", ds.name)
                logger.info(u"task=refresh_schema state=failed ds_id=%s runtime=%.2f", ds.id, time.time() - start_time)

    logger.info(u"task=refresh_schemas state=finish total_runtime=%.2f", time.time() - global_start_time)


def signal_handler(*args):
    raise InterruptException


class QueryExecutionError(Exception):
    pass


# We could have created this as a celery.Task derived class, and act as the task itself. But this might result in weird
# issues as the task class created once per process, so decided to have a plain object instead.
class QueryExecutor(object):
    def __init__(self, task, query, data_source_id, user_id, metadata):
        self.task = task
        self.query = query
        self.data_source_id = data_source_id
        self.metadata = metadata
        self.data_source = self._load_data_source()
        if user_id is not None:
            self.user = models.User.query.get(user_id)
        else:
            self.user = None
        self.query_hash = gen_query_hash(self.query)
        # Load existing tracker or create a new one if the job was created before code update:
        self.tracker = QueryTaskTracker.get_by_task_id(task.request.id) or QueryTaskTracker.create(task.request.id,
                                                                                                   'created',
                                                                                                   self.query_hash,
                                                                                                   self.data_source_id,
                                                                                                   False, metadata)

    def run(self):
        signal.signal(signal.SIGINT, signal_handler)
        self.tracker.update(started_at=time.time(), state='started')

        logger.debug("Executing query:\n%s", self.query)
        self._log_progress('executing_query')

        query_runner = self.data_source.query_runner
        annotated_query = self._annotate_query(query_runner)

        try:
            data, error = query_runner.run_query(annotated_query, self.user)
        except Exception as e:
            error = unicode(e)
            data = None
            logging.warning('Unexpected error while running query:', exc_info=1)

        run_time = time.time() - self.tracker.started_at
        self.tracker.update(error=error, run_time=run_time, state='saving_results')

        logger.info(u"task=execute_query query_hash=%s data_length=%s error=[%s]", self.query_hash, data and len(data), error)

        _unlock(self.query_hash, self.data_source.id)

        if error:
            self.tracker.update(state='failed')
            result = QueryExecutionError(error)
        else:
            query_result, updated_query_ids = models.QueryResult.store_result(
                self.data_source.org, self.data_source,
                self.query_hash, self.query, data,
                run_time, utils.utcnow())
            self._log_progress('checking_alerts')
            for query_id in updated_query_ids:
                check_alerts_for_query.delay(query_id)
            self._log_progress('finished')

            result = query_result.id
        models.db.session.commit()
        return result

    def _annotate_query(self, query_runner):
        if query_runner.annotate_query():
            self.metadata['Task ID'] = self.task.request.id
            self.metadata['Query Hash'] = self.query_hash
            self.metadata['Queue'] = self.task.request.delivery_info['routing_key']

            annotation = u", ".join([u"{}: {}".format(k, v) for k, v in self.metadata.iteritems()])
            annotated_query = u"/* {} */ {}".format(annotation, self.query)
        else:
            annotated_query = self.query
        return annotated_query

    def _log_progress(self, state):
        logger.info(u"task=execute_query state=%s query_hash=%s type=%s ds_id=%d task_id=%s queue=%s query_id=%s username=%s",
                    state,
                    self.query_hash, self.data_source.type, self.data_source.id, self.task.request.id, self.task.request.delivery_info['routing_key'],
                    self.metadata.get('Query ID', 'unknown'), self.metadata.get('Username', 'unknown'))
        self.tracker.update(state=state)

    def _load_data_source(self):
        logger.info("task=execute_query state=load_ds ds_id=%d", self.data_source_id)
        return models.DataSource.query.get(self.data_source_id)


# user_id is added last as a keyword argument for backward compatability -- to support executing previously submitted
# jobs before the upgrade to this version.
@celery.task(name="redash.tasks.execute_query", bind=True, track_started=True)
def execute_query(self, query, data_source_id, metadata, user_id=None):
    return QueryExecutor(self, query, data_source_id, user_id, metadata).run()
