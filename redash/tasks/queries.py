import logging
import signal
import time

import redis
from celery.exceptions import SoftTimeLimitExceeded, TimeLimitExceeded
from celery.result import AsyncResult
from celery.utils.log import get_task_logger
from six import text_type

from redash import models, redis_connection, settings, statsd_client
from redash.query_runner import InterruptException
from redash.tasks.alerts import check_alerts_for_query
from redash.utils import gen_query_hash, json_dumps, json_loads, utcnow, mustache_render
from redash.worker import celery

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
        connection.set(key_name, json_dumps(self.data))
        connection.zadd(self._get_list(), {key_name: time.time()})

        for _list in self.ALL_LISTS:
            if _list != self._get_list():
                connection.zrem(_list, key_name)

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
            data = json_loads(data)
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
    def prune(cls, list_name, keep_count, max_keys=100):
        count = redis_connection.zcard(list_name)
        if count <= keep_count:
            return 0

        remove_count = min(max_keys, count - keep_count)
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
        task_info = self._async_result._get_task_meta()
        result, task_status = task_info['result'], task_info['status']
        if task_status == 'STARTED':
            updated_at = result.get('start_time', 0)
        else:
            updated_at = 0

        status = self.STATUSES[task_status]

        if isinstance(result, (TimeLimitExceeded, SoftTimeLimitExceeded)):
            error = "Query exceeded Redash query execution time limit."
            status = 4
        elif isinstance(result, Exception):
            error = result.message
            status = 4
        elif task_status == 'REVOKED':
            error = 'Query execution cancelled.'
        else:
            error = ''

        if task_status == 'SUCCESS' and not error:
            query_result_id = result
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


def enqueue_query(query, data_source, user_id, scheduled_query=None, metadata={}):
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

                time_limit = None

                if scheduled_query:
                    queue_name = data_source.scheduled_queue_name
                    scheduled_query_id = scheduled_query.id
                else:
                    queue_name = data_source.queue_name
                    scheduled_query_id = None
                    time_limit = settings.ADHOC_QUERY_TIME_LIMIT

                args = (query, data_source.id, metadata, user_id, scheduled_query_id)
                argsrepr = json_dumps({
                    'org_id': data_source.org_id,
                    'data_source_id': data_source.id,
                    'enqueue_time': time.time(),
                    'scheduled': scheduled_query_id is not None,
                    'query_id': metadata.get('Query ID'),
                    'user_id': user_id
                })

                result = execute_query.apply_async(args=args,
                                                   argsrepr=argsrepr,
                                                   queue=queue_name,
                                                   time_limit=time_limit)

                job = QueryTask(async_result=result)
                tracker = QueryTaskTracker.create(
                    result.id, 'created', query_hash, data_source.id,
                    scheduled_query is not None, metadata)
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
            elif query.org.is_disabled:
                logging.debug("Skipping refresh of %s because org is disabled.", query.id)
            elif query.data_source is None:
                logging.info("Skipping refresh of %s because the datasource is none.", query.id)
            elif query.data_source.paused:
                logging.info("Skipping refresh of %s because datasource - %s is paused (%s).", query.id, query.data_source.name, query.data_source.pause_reason)
            else:
                if query.options and len(query.options.get('parameters', [])) > 0:
                    query_params = {p['name']: p.get('value')
                                    for p in query.options['parameters']}
                    query_text = mustache_render(query.query_text, query_params)
                else:
                    query_text = query.query_text

                enqueue_query(query_text, query.data_source, query.user_id,
                              scheduled_query=query,
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
        'query_ids': json_dumps(query_ids)
    })

    statsd_client.gauge('manager.seconds_since_refresh', now - float(status.get('last_refresh_at', now)))


@celery.task(name="redash.tasks.cleanup_tasks")
def cleanup_tasks():
    in_progress = QueryTaskTracker.all(QueryTaskTracker.IN_PROGRESS_LIST)
    for tracker in in_progress:
        result = AsyncResult(tracker.task_id)

        if result.ready():
            logging.info("in progress tracker %s finished", tracker.query_hash)
            _unlock(tracker.query_hash, tracker.data_source_id)
            tracker.update(state='finished')

    # Maintain constant size of the finished tasks list:
    removed = 1000
    while removed > 0:
        removed = QueryTaskTracker.prune(QueryTaskTracker.DONE_LIST, 1000)

    waiting = QueryTaskTracker.all(QueryTaskTracker.WAITING_LIST)
    for tracker in waiting:
        if tracker is None:
            continue

        result = AsyncResult(tracker.task_id)

        if result.ready():
            logging.info("waiting tracker %s finished", tracker.query_hash)
            _unlock(tracker.query_hash, tracker.data_source_id)
            tracker.update(state='finished')


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


@celery.task(name="redash.tasks.refresh_schema", time_limit=90, soft_time_limit=60)
def refresh_schema(data_source_id):
    ds = models.DataSource.get_by_id(data_source_id)
    logger.info(u"task=refresh_schema state=start ds_id=%s", ds.id)
    start_time = time.time()
    try:
        ds.get_schema(refresh=True)
        logger.info(u"task=refresh_schema state=finished ds_id=%s runtime=%.2f", ds.id, time.time() - start_time)
        statsd_client.incr('refresh_schema.success')
    except SoftTimeLimitExceeded:
        logger.info(u"task=refresh_schema state=timeout ds_id=%s runtime=%.2f", ds.id, time.time() - start_time)
        statsd_client.incr('refresh_schema.timeout')
    except Exception:
        logger.warning(u"Failed refreshing schema for the data source: %s", ds.name, exc_info=1)
        statsd_client.incr('refresh_schema.error')
        logger.info(u"task=refresh_schema state=failed ds_id=%s runtime=%.2f", ds.id, time.time() - start_time)


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
        elif ds.org.is_disabled:
            logger.info(u"task=refresh_schema state=skip ds_id=%s reason=org_disabled", ds.id)
        else:
            refresh_schema.apply_async(args=(ds.id,), queue="schemas")

    logger.info(u"task=refresh_schemas state=finish total_runtime=%.2f", time.time() - global_start_time)


def signal_handler(*args):
    raise InterruptException


class QueryExecutionError(Exception):
    pass


# We could have created this as a celery.Task derived class, and act as the task itself. But this might result in weird
# issues as the task class created once per process, so decided to have a plain object instead.
class QueryExecutor(object):
    def __init__(self, task, query, data_source_id, user_id, metadata,
                 scheduled_query):
        self.task = task
        self.query = query
        self.data_source_id = data_source_id
        self.metadata = metadata
        self.data_source = self._load_data_source()
        if user_id is not None:
            self.user = models.User.query.get(user_id)
        else:
            self.user = None
        # Close DB connection to prevent holding a connection for a long time while the query is executing.
        models.db.session.close()
        self.query_hash = gen_query_hash(self.query)
        self.scheduled_query = scheduled_query
        # Load existing tracker or create a new one if the job was created before code update:
        self.tracker = (
            QueryTaskTracker.get_by_task_id(task.request.id) or
            QueryTaskTracker.create(
                task.request.id,
                'created',
                self.query_hash,
                self.data_source_id,
                False,
                metadata
            )
        )
        if self.tracker.scheduled:
            models.scheduled_queries_executions.update(self.tracker.query_id)

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
            error = text_type(e)
            data = None
            logging.warning('Unexpected error while running query:', exc_info=1)

        run_time = time.time() - self.tracker.started_at
        self.tracker.update(error=error, run_time=run_time, state='saving_results')

        logger.info(u"task=execute_query query_hash=%s data_length=%s error=[%s]", self.query_hash, data and len(data), error)

        _unlock(self.query_hash, self.data_source.id)

        if error:
            self.tracker.update(state='failed')
            result = QueryExecutionError(error)
            if self.scheduled_query is not None:
                self.scheduled_query = models.db.session.merge(self.scheduled_query, load=False)
                self.scheduled_query.schedule_failures += 1
                models.db.session.add(self.scheduled_query)
            models.db.session.commit()
            raise result
        else:
            if (self.scheduled_query and self.scheduled_query.schedule_failures > 0):
                self.scheduled_query = models.db.session.merge(self.scheduled_query, load=False)
                self.scheduled_query.schedule_failures = 0
                models.db.session.add(self.scheduled_query)
            query_result, updated_query_ids = models.QueryResult.store_result(
                self.data_source.org_id, self.data_source,
                self.query_hash, self.query, data,
                run_time, utcnow())
            models.db.session.commit()  # make sure that alert sees the latest query result
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
        logger.info(
            u"task=execute_query state=%s query_hash=%s type=%s ds_id=%d  "
            "task_id=%s queue=%s query_id=%s username=%s",
            state, self.query_hash, self.data_source.type, self.data_source.id,
            self.task.request.id,
            self.task.request.delivery_info['routing_key'],
            self.metadata.get('Query ID', 'unknown'),
            self.metadata.get('Username', 'unknown'))
        self.tracker.update(state=state)

    def _load_data_source(self):
        logger.info("task=execute_query state=load_ds ds_id=%d", self.data_source_id)
        return models.DataSource.query.get(self.data_source_id)


# user_id is added last as a keyword argument for backward compatability -- to support executing previously submitted
# jobs before the upgrade to this version.
@celery.task(name="redash.tasks.execute_query", bind=True, track_started=True)
def execute_query(self, query, data_source_id, metadata, user_id=None,
                  scheduled_query_id=None):
    if scheduled_query_id is not None:
        scheduled_query = models.Query.query.get(scheduled_query_id)
    else:
        scheduled_query = None
    return QueryExecutor(self, query, data_source_id, user_id, metadata,
                         scheduled_query).run()
