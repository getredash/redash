import datetime
import time
import logging
import signal
from flask_mail import Message
import redis
import hipchat
import requests
from redash.utils import json_dumps
from requests.auth import HTTPBasicAuth
from celery import Task
from celery.result import AsyncResult
from celery.utils.log import get_task_logger
from redash import redis_connection, models, statsd_client, settings, utils, mail
from redash.utils import gen_query_hash
from redash.worker import celery
from redash.query_runner import InterruptException
from version_check import run_version_check

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
    def add_task(cls, query, data_source, scheduled=False, metadata={}):
        query_hash = gen_query_hash(query)
        logging.info("[Manager][%s] Inserting job", query_hash)
        logging.info("[Manager] Metadata: [%s]", metadata)
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
                    if job.ready():
                        logging.info("[%s] job found is ready (%s), removing lock", query_hash, job.celery_status)
                        redis_connection.delete(QueryTask._job_lock_id(query_hash, data_source.id))
                        job = None

                if not job:
                    pipe.multi()

                    if scheduled:
                        queue_name = data_source.scheduled_queue_name
                    else:
                        queue_name = data_source.queue_name

                    result = execute_query.apply_async(args=(query, data_source.id, metadata), queue=queue_name)
                    job = cls(async_result=result)

                    logging.info("[Manager][%s] Created new job: %s", query_hash, job.id)
                    pipe.set(cls._job_lock_id(query_hash, data_source.id), job.id, settings.JOB_EXPIRY_TIME)
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
        QueryTask.add_task(query.query, query.data_source, scheduled=True,
                           metadata={'Query ID': query.id, 'Username': 'Scheduled'})
        outdated_queries_count += 1

    statsd_client.gauge('manager.outdated_queries', outdated_queries_count)

    logger.info("Done refreshing queries. Found %d outdated queries." % outdated_queries_count)

    status = redis_connection.hgetall('redash:status')
    now = time.time()

    redis_connection.hmset('redash:status', {
        'outdated_queries_count': outdated_queries_count,
        'last_refresh_at': now
    })

    statsd_client.gauge('manager.seconds_since_refresh', now - float(status.get('last_refresh_at', now)))


@celery.task(base=BaseTask)
def cleanup_tasks():
    # in case of cold restart of the workers, there might be jobs that still have their "lock" object, but aren't really
    # going to run. this job removes them.
    lock_keys = redis_connection.keys("query_hash_job:*") # TODO: use set instead of keys command
    if not lock_keys:
        return

    query_tasks = [QueryTask(job_id=j) for j in redis_connection.mget(lock_keys)]

    logger.info("Found %d locks", len(query_tasks))

    inspect = celery.control.inspect()
    active_tasks = inspect.active()
    if active_tasks is None:
        active_tasks = []
    else:
        active_tasks = active_tasks.values()

    all_tasks = set()
    for task_list in active_tasks:
        for task in task_list:
            all_tasks.add(task['id'])

    logger.info("Active jobs count: %d", len(all_tasks))

    for i, t in enumerate(query_tasks):
        if t.ready():
            # if locked task is ready already (failed, finished, revoked), we don't need the lock anymore
            logger.warning("%s is ready (%s), removing lock.", lock_keys[i], t.celery_status)
            redis_connection.delete(lock_keys[i])

        # if t.celery_status == 'STARTED' and t.id not in all_tasks:
        #     logger.warning("Couldn't find active job for: %s, removing lock.", lock_keys[i])
        #     redis_connection.delete(lock_keys[i])


@celery.task(base=BaseTask)
def cleanup_query_results():
    """
    Job to cleanup unused query results -- such that no query links to them anymore, and older than a week (so it's less
    likely to be open in someone's browser and be used).

    Each time the job deletes only 100 query results so it won't choke the database in case of many such results.
    """

    logging.info("Running query results clean up (removing maximum of %d unused results, that are %d days old or more)",
                 settings.QUERY_RESULTS_CLEANUP_COUNT, settings.QUERY_RESULTS_CLEANUP_MAX_AGE)

    unused_query_results = models.QueryResult.unused(settings.QUERY_RESULTS_CLEANUP_MAX_AGE).limit(settings.QUERY_RESULTS_CLEANUP_COUNT)
    total_unused_query_results = models.QueryResult.unused().count()
    deleted_count = models.QueryResult.delete().where(models.QueryResult.id << unused_query_results).execute()

    logger.info("Deleted %d unused query results out of total of %d." % (deleted_count, total_unused_query_results))


@celery.task(base=BaseTask)
def refresh_schemas():
    """
    Refreshs the datasources schema.
    """

    for ds in models.DataSource.select():
        logger.info("Refreshing schema for: {}".format(ds.name))
        try:
            ds.get_schema(refresh=True)
        except Exception:
            logger.exception("Failed refreshing the data source: %s", ds.name)


def signal_handler(*args):
    raise InterruptException


class QueryExecutionError(Exception):
    pass


# TODO: convert this into a class, to simplify and avoid code duplication for logging
# class ExecuteQueryTask(BaseTask):
#     def run(self, ...):
#         # logic
@celery.task(bind=True, base=BaseTask, track_started=True, throws=(QueryExecutionError,))
def execute_query(self, query, data_source_id, metadata):
    signal.signal(signal.SIGINT, signal_handler)
    start_time = time.time()

    logger.info("task=execute_query state=load_ds ds_id=%d", data_source_id)

    data_source = models.DataSource.get_by_id(data_source_id)

    self.update_state(state='STARTED', meta={'start_time': start_time, 'custom_message': ''})

    logger.debug("Executing query:\n%s", query)

    query_hash = gen_query_hash(query)
    query_runner = data_source.query_runner

    logger.info("task=execute_query state=before query_hash=%s type=%s ds_id=%d task_id=%s queue=%s query_id=%s username=%s",
                query_hash, data_source.type, data_source.id, self.request.id, self.request.delivery_info['routing_key'],
                metadata.get('Query ID', 'unknown'), metadata.get('Username', 'unknown'))

    if query_runner.annotate_query():
        metadata['Task ID'] = self.request.id
        metadata['Query Hash'] = query_hash
        metadata['Queue'] = self.request.delivery_info['routing_key']

        annotation = u", ".join([u"{}: {}".format(k, v) for k, v in metadata.iteritems()])

        logging.debug(u"Annotation: %s", annotation)

        annotated_query = u"/* {} */ {}".format(annotation, query)
    else:
        annotated_query = query

    with statsd_client.timer('query_runner.{}.{}.run_time'.format(data_source.type, data_source.name)):
        data, error = query_runner.run_query(annotated_query)

    logger.info("task=execute_query state=after query_hash=%s type=%s ds_id=%d task_id=%s queue=%s query_id=%s username=%s",
                query_hash, data_source.type, data_source.id, self.request.id, self.request.delivery_info['routing_key'],
                metadata.get('Query ID', 'unknown'), metadata.get('Username', 'unknown'))

    run_time = time.time() - start_time
    logger.info("Query finished... data length=%s, error=%s", data and len(data), error)

    self.update_state(state='STARTED', meta={'start_time': start_time, 'error': error, 'custom_message': ''})

    # Delete query_hash
    redis_connection.delete(QueryTask._job_lock_id(query_hash, data_source.id))

    if not error:
        query_result, updated_query_ids = models.QueryResult.store_result(data_source.org_id, data_source.id, query_hash, query, data, run_time, utils.utcnow())
        logger.info("task=execute_query state=after_store query_hash=%s type=%s ds_id=%d task_id=%s queue=%s query_id=%s username=%s",
                    query_hash, data_source.type, data_source.id, self.request.id, self.request.delivery_info['routing_key'],
                    metadata.get('Query ID', 'unknown'), metadata.get('Username', 'unknown'))
        for query_id in updated_query_ids:
            check_alerts_for_query.delay(query_id)
        logger.info("task=execute_query state=after_alerts query_hash=%s type=%s ds_id=%d task_id=%s queue=%s query_id=%s username=%s",
                    query_hash, data_source.type, data_source.id, self.request.id, self.request.delivery_info['routing_key'],
                    metadata.get('Query ID', 'unknown'), metadata.get('Username', 'unknown'))
    else:
        raise QueryExecutionError(error)

    return query_result.id


@celery.task(base=BaseTask)
def record_event(event):
    models.Event.record(event)

@celery.task(base=BaseTask)
def version_check():
    run_version_check()


def base_url(org):
    if settings.MULTI_ORG:
        return "https://{}/{}".format(settings.HOST, org.slug)

    return settings.HOST


@celery.task(bind=True, base=BaseTask)
def check_alerts_for_query(self, query_id):
    from redash.wsgi import app

    logger.debug("Checking query %d for alerts", query_id)
    query = models.Query.get_by_id(query_id)
    for alert in query.alerts:
        alert.query = query
        new_state = alert.evaluate()
        passed_rearm_threshold = False
        if alert.rearm and alert.last_triggered_at:
            passed_rearm_threshold = alert.last_triggered_at + datetime.timedelta(seconds=alert.rearm) < utils.utcnow()
        if new_state != alert.state or (alert.state == models.Alert.TRIGGERED_STATE and passed_rearm_threshold ):
            logger.info("Alert %d new state: %s", alert.id, new_state)
            old_state = alert.state
            alert.update_instance(state=new_state, last_triggered_at=utils.utcnow())

            if old_state == models.Alert.UNKNOWN_STATE and new_state == models.Alert.OK_STATE:
                logger.debug("Skipping notification (previous state was unknown and now it's ok).")
                continue

            # message = Message
            html = """
            Check <a href="{host}/alerts/{alert_id}">alert</a> / check <a href="{host}/queries/{query_id}">query</a>.
            """.format(host=base_url(alert.query.org), alert_id=alert.id, query_id=query.id)

            notify_mail(alert, html, new_state, app)

            if settings.HIPCHAT_API_TOKEN:
                notify_hipchat(alert, html, new_state)

            if settings.WEBHOOK_ENDPOINT:
                notify_webhook(alert, query, html, new_state)


def notify_hipchat(alert, html, new_state):
    try:
        if settings.HIPCHAT_API_URL:
            hipchat_client = hipchat.HipChat(token=settings.HIPCHAT_API_TOKEN, url=settings.HIPCHAT_API_URL)
        else:
            hipchat_client = hipchat.HipChat(token=settings.HIPCHAT_API_TOKEN)
        message = '[' + new_state.upper() + '] ' + alert.name + '<br />' + html
        hipchat_client.message_room(settings.HIPCHAT_ROOM_ID, settings.NAME, message.encode('utf-8', 'ignore'), message_format='html')
    except Exception:
        logger.exception("hipchat send ERROR.")


def notify_mail(alert, html, new_state, app):
    recipients = [s.email for s in alert.subscribers()]
    logger.debug("Notifying: %s", recipients)
    try:
        with app.app_context():
            message = Message(recipients=recipients,
                              subject="[{1}] {0}".format(alert.name.encode('utf-8', 'ignore'), new_state.upper()),
                              html=html)
            mail.send(message)
    except Exception:
        logger.exception("mail send ERROR.")


def notify_webhook(alert, query, html, new_state):
    try:
        data = {
            'event': 'alert_state_change',
            'alert': alert.to_dict(full=False),
            'url_base': base_url(query.org)
        }
        headers = {'Content-Type': 'application/json'}
        auth = HTTPBasicAuth(settings.WEBHOOK_USERNAME, settings.WEBHOOK_PASSWORD) if settings.WEBHOOK_USERNAME else None
        resp = requests.post(settings.WEBHOOK_ENDPOINT, data=json_dumps(data), auth=auth, headers=headers)
        if resp.status_code != 200:
            logger.error("webhook send ERROR. status_code => {status}".format(status=resp.status_code))
    except Exception:
        logger.exception("webhook send ERROR.")
