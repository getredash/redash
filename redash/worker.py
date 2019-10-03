
from datetime import timedelta
from random import randint

from flask import current_app

from celery import Celery
from celery.schedules import crontab
from celery.signals import worker_process_init
from celery.utils.log import get_logger

from redash import create_app, extensions, settings
from redash.metrics import celery as celery_metrics  # noqa

logger = get_logger(__name__)


celery = Celery('redash',
                broker=settings.CELERY_BROKER,
                broker_use_ssl=settings.CELERY_SSL_CONFIG,
                redis_backend_use_ssl=settings.CELERY_SSL_CONFIG,
                include='redash.tasks')

# The internal periodic Celery tasks to automatically schedule.
celery_schedule = {
    'refresh_queries': {
        'task': 'redash.tasks.refresh_queries',
        'schedule': timedelta(seconds=30)
    },
    'empty_schedules': {
        'task': 'redash.tasks.empty_schedules',
        'schedule': timedelta(minutes=60)
    },
    'refresh_schemas': {
        'task': 'redash.tasks.refresh_schemas',
        'schedule': timedelta(minutes=settings.SCHEMAS_REFRESH_SCHEDULE)
    },
    'sync_user_details': {
        'task': 'redash.tasks.sync_user_details',
        'schedule': timedelta(minutes=1),
    },
    'send_aggregated_errors': {
        'task': 'redash.tasks.send_aggregated_errors',
        'schedule': timedelta(minutes=settings.SEND_FAILURE_EMAIL_INTERVAL),
    }
}

if settings.VERSION_CHECK:
    celery_schedule['version_check'] = {
        'task': 'redash.tasks.version_check',
        # We need to schedule the version check to run at a random hour/minute, to spread the requests from all users
        # evenly.
        'schedule': crontab(minute=randint(0, 59), hour=randint(0, 23))
    }

if settings.QUERY_RESULTS_CLEANUP_ENABLED:
    celery_schedule['cleanup_query_results'] = {
        'task': 'redash.tasks.cleanup_query_results',
        'schedule': timedelta(minutes=5)
    }

celery_schedule.update(settings.dynamic_settings.custom_tasks())

celery.conf.update(result_backend=settings.CELERY_RESULT_BACKEND,
                   beat_schedule=celery_schedule,
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
    for params in list(extensions.periodic_tasks.values()):
        # Add it to Celery's periodic task registry, too.
        sender.add_periodic_task(**params)
