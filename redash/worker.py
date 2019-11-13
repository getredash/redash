import errno
import os
from datetime import timedelta
from functools import partial

from flask import current_app
import logging

from celery import Celery
from celery.signals import worker_process_init
from celery.utils.log import get_logger

from rq import Worker, get_current_job
from rq.utils import utcnow
from rq.decorators import job as rq_job
from rq.timeouts import UnixSignalDeathPenalty, HorseMonitorTimeoutException
from rq.job import JobStatus

from redash import create_app, extensions, settings, redis_connection, rq_redis_connection
from redash.metrics import celery as celery_metrics  # noqa

logger = get_logger(__name__)

job = partial(rq_job, connection=rq_redis_connection)


class CurrentJobFilter(logging.Filter):
    def filter(self, record):
        current_job = get_current_job()

        record.job_id = current_job.id if current_job else ''
        record.job_description = current_job.description if current_job else ''

        return True


def get_job_logger(name):
    logger = logging.getLogger('rq.job.' + name)

    handler = logging.StreamHandler()
    handler.formatter = logging.Formatter(settings.RQ_WORKER_JOB_LOG_FORMAT)
    handler.addFilter(CurrentJobFilter())

    logger.addHandler(handler)
    logger.propagate = False

    return logger


celery = Celery('redash',
                broker=settings.CELERY_BROKER,
                broker_use_ssl=settings.CELERY_SSL_CONFIG,
                redis_backend_use_ssl=settings.CELERY_SSL_CONFIG,
                include='redash.tasks')


celery.conf.update(result_backend=settings.CELERY_RESULT_BACKEND,
                   timezone='UTC',
                   result_expires=settings.CELERY_RESULT_EXPIRES,
                   worker_log_format=settings.CELERYD_WORKER_LOG_FORMAT,
                   worker_task_log_format=settings.CELERYD_WORKER_TASK_LOG_FORMAT,
                   worker_prefetch_multiplier=settings.CELERY_WORKER_PREFETCH_MULTIPLIER,
                   accept_content=settings.CELERY_ACCEPT_CONTENT,
                   task_serializer=settings.CELERY_TASK_SERIALIZER,
                   result_serializer=settings.CELERY_RESULT_SERIALIZER)

# Create a new Task base class, that pushes a new Flask app context to allow DB connections if needed.
TaskBase = celery.Task


class ContextTask(TaskBase):
    abstract = True

    def __call__(self, *args, **kwargs):
        with current_app.app_context():
            return TaskBase.__call__(self, *args, **kwargs)


celery.Task = ContextTask


@worker_process_init.connect
def init_celery_flask_app(**kwargs):
    """Create the Flask app after forking a new worker.

    This is to make sure no resources are shared between processes.
    """
    app = create_app()
    app.app_context().push()


@celery.on_after_configure.connect
def add_periodic_tasks(sender, **kwargs):
    """Load all periodic tasks from extensions and add them to Celery."""
    # Populate the redash.extensions.periodic_tasks dictionary
    extensions.load_periodic_tasks(logger)
    for params in extensions.periodic_tasks.values():
        # Add it to Celery's periodic task registry, too.
        sender.add_periodic_task(**params)


class HardTimeLimitingWorker(Worker):
    grace_period = 15

    def monitor_work_horse(self, job):
        """The worker will monitor the work horse and make sure that it
        either executes successfully or the status of the job is set to
        failed
        """
        monitor_started = utcnow()
        while True:
            try:
                with UnixSignalDeathPenalty(self.job_monitoring_interval, HorseMonitorTimeoutException):
                    retpid, ret_val = os.waitpid(self._horse_pid, 0)
                break
            except HorseMonitorTimeoutException:
                # Horse has not exited yet and is still running.
                # Send a heartbeat to keep the worker alive.
                self.heartbeat(self.job_monitoring_interval + 5)

                seconds_under_monitor = (utcnow() - monitor_started).seconds
                if seconds_under_monitor > job.timeout + self.grace_period:
                    self.log.warning('Job %s exceeded timeout of %ds (+%ds grace period) but work horse did not terminate it. '
                                     'Killing the work horse.', job.id, job.timeout, self.grace_period)
                    self.kill_horse()
            except OSError as e:
                # In case we encountered an OSError due to EINTR (which is
                # caused by a SIGINT or SIGTERM signal during
                # os.waitpid()), we simply ignore it and enter the next
                # iteration of the loop, waiting for the child to end.  In
                # any other case, this is some other unexpected OS error,
                # which we don't want to catch, so we re-raise those ones.
                if e.errno != errno.EINTR:
                    raise
                # Send a heartbeat to keep the worker alive.
                self.heartbeat()

        if ret_val == os.EX_OK:  # The process exited normally.
            return
        job_status = job.get_status()
        if job_status is None:  # Job completed and its ttl has expired
            return
        if job_status not in [JobStatus.FINISHED, JobStatus.FAILED]:

            if not job.ended_at:
                job.ended_at = utcnow()

            # Unhandled failure: move the job to the failed queue
            self.log.warning((
                'Moving job to FailedJobRegistry '
                '(work-horse terminated unexpectedly; waitpid returned {})'
            ).format(ret_val))

            self.handle_job_failure(
                job,
                exc_string="Work-horse process was terminated unexpectedly "
                           "(waitpid returned %s)" % ret_val
            )
