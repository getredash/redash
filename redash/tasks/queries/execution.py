import logging
import signal
import time
import redis
from six import text_type

from rq import get_current_job
from rq.job import JobStatus
from rq.timeouts import JobTimeoutException

from redash import models, redis_connection, settings
from redash.query_runner import InterruptException
from redash.tasks.worker import Queue, Job
from redash.tasks.alerts import check_alerts_for_query
from redash.tasks.failure_report import track_failure
from redash.utils import gen_query_hash, json_dumps, utcnow
from redash.worker import celery, get_job_logger

logger = get_job_logger(__name__)
TIMEOUT_MESSAGE = "Query exceeded Redash query execution time limit."


def _job_lock_id(query_hash, data_source_id):
    return "query_hash_job:%s:%s" % (data_source_id, query_hash)


def _unlock(query_hash, data_source_id):
    redis_connection.delete(_job_lock_id(query_hash, data_source_id))


def enqueue_query(
    query, data_source, user_id, is_api_key=False, scheduled_query=None, metadata={}
):
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

                job = Job.fetch(job_id)

                status = job.get_status()
                if status in [JobStatus.FINISHED, JobStatus.FAILED]:
                    logging.info(
                        "[%s] job found is ready (%s), removing lock",
                        query_hash,
                        status,
                    )
                    redis_connection.delete(_job_lock_id(query_hash, data_source.id))
                    job = None

            if not job:
                pipe.multi()

                if scheduled_query:
                    queue_name = data_source.scheduled_queue_name
                    scheduled_query_id = scheduled_query.id
                else:
                    queue_name = data_source.queue_name
                    scheduled_query_id = None

                time_limit = settings.dynamic_settings.query_time_limit(
                    scheduled_query, user_id, data_source.org_id
                )
                metadata["Queue"] = queue_name

                queue = Queue(queue_name)
                job = queue.enqueue(
                    execute_query,
                    query,
                    data_source.id,
                    metadata,
                    user_id=user_id,
                    scheduled_query_id=scheduled_query_id,
                    is_api_key=is_api_key,
                    job_timeout=time_limit,
                )

                logging.info("[%s] Created new job: %s", query_hash, job.id)
                pipe.set(
                    _job_lock_id(query_hash, data_source.id),
                    job.id,
                    settings.JOB_EXPIRY_TIME,
                )
                pipe.execute()
            break

        except redis.WatchError:
            continue

    if not job:
        logging.error("[Manager][%s] Failed adding job for query.", query_hash)

    return job


def signal_handler(*args):
    raise InterruptException


class QueryExecutionError(Exception):
    pass


def _resolve_user(user_id, is_api_key, query_id):
    if user_id is not None:
        if is_api_key:
            api_key = user_id
            if query_id is not None:
                q = models.Query.get_by_id(query_id)
            else:
                q = models.Query.by_api_key(api_key)

            return models.ApiUser(api_key, q.org, q.groups)
        else:
            return models.User.get_by_id(user_id)
    else:
        return None


class QueryExecutor(object):
    def __init__(
        self, query, data_source_id, user_id, is_api_key, metadata, scheduled_query
    ):
        self.job = get_current_job()
        self.query = query
        self.data_source_id = data_source_id
        self.metadata = metadata
        self.data_source = self._load_data_source()
        self.user = _resolve_user(user_id, is_api_key, metadata.get("Query ID"))

        # Close DB connection to prevent holding a connection for a long time while the query is executing.
        models.db.session.close()
        self.query_hash = gen_query_hash(self.query)
        self.scheduled_query = scheduled_query
        # Load existing tracker or create a new one if the job was created before code update:
        if scheduled_query:
            models.scheduled_queries_executions.update(scheduled_query.id)

    def run(self):
        signal.signal(signal.SIGINT, signal_handler)
        started_at = time.time()

        logger.debug("Executing query:\n%s", self.query)
        self._log_progress("executing_query")

        query_runner = self.data_source.query_runner
        annotated_query = self._annotate_query(query_runner)

        try:
            data, error = query_runner.run_query(annotated_query, self.user)
        except Exception as e:
            if isinstance(e, JobTimeoutException):
                error = TIMEOUT_MESSAGE
            else:
                error = text_type(e)

            data = None
            logging.warning("Unexpected error while running query:", exc_info=1)

        run_time = time.time() - started_at

        logger.info(
            "job=execute_query query_hash=%s data_length=%s error=[%s]",
            self.query_hash,
            data and len(data),
            error,
        )

        _unlock(self.query_hash, self.data_source.id)

        if error is not None and data is None:
            result = QueryExecutionError(error)
            if self.scheduled_query is not None:
                self.scheduled_query = models.db.session.merge(
                    self.scheduled_query, load=False
                )
                track_failure(self.scheduled_query, error)
            raise result
        else:
            if self.scheduled_query and self.scheduled_query.schedule_failures > 0:
                self.scheduled_query = models.db.session.merge(
                    self.scheduled_query, load=False
                )
                self.scheduled_query.schedule_failures = 0
                self.scheduled_query.skip_updated_at = True
                models.db.session.add(self.scheduled_query)

            query_result = models.QueryResult.store_result(
                self.data_source.org_id,
                self.data_source,
                self.query_hash,
                self.query,
                data,
                run_time,
                utcnow(),
            )

            updated_query_ids = models.Query.update_latest_result(query_result)

            models.db.session.commit()  # make sure that alert sees the latest query result
            self._log_progress("checking_alerts")
            for query_id in updated_query_ids:
                check_alerts_for_query.delay(query_id)
            self._log_progress("finished")

            result = query_result.id
            models.db.session.commit()
            return result

    def _annotate_query(self, query_runner):
        self.metadata["Job ID"] = self.job.id
        self.metadata["Query Hash"] = self.query_hash
        self.metadata["Scheduled"] = self.scheduled_query is not None

        return query_runner.annotate_query(self.query, self.metadata)

    def _log_progress(self, state):
        logger.info(
            "job=execute_query state=%s query_hash=%s type=%s ds_id=%d  "
            "job_id=%s queue=%s query_id=%s username=%s",
            state,
            self.query_hash,
            self.data_source.type,
            self.data_source.id,
            self.job.id,
            self.metadata.get("Queue", "unknown"),
            self.metadata.get("Query ID", "unknown"),
            self.metadata.get("Username", "unknown"),
        )

    def _load_data_source(self):
        logger.info("job=execute_query state=load_ds ds_id=%d", self.data_source_id)
        return models.DataSource.query.get(self.data_source_id)


# user_id is added last as a keyword argument for backward compatability -- to support executing previously submitted
# jobs before the upgrade to this version.
def execute_query(
    query,
    data_source_id,
    metadata,
    user_id=None,
    scheduled_query_id=None,
    is_api_key=False,
):
    if scheduled_query_id is not None:
        scheduled_query = models.Query.query.get(scheduled_query_id)
    else:
        scheduled_query = None

    try:
        return QueryExecutor(
            query, data_source_id, user_id, is_api_key, metadata, scheduled_query
        ).run()
    except QueryExecutionError as e:
        models.db.session.rollback()
        return e
