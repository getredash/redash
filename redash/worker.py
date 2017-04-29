from __future__ import absolute_import

from random import randint
from celery import Celery
from flask import current_app
from datetime import timedelta
from celery.schedules import crontab
from celery.signals import worker_process_init
from redash import settings, __version__, create_app
from redash.metrics import celery as celery_metrics


celery = Celery('redash',
                broker=settings.CELERY_BROKER,
                include='redash.tasks')

celery_schedule = {
    'refresh_queries': {
        'task': 'redash.tasks.refresh_queries',
        'schedule': timedelta(seconds=30)
    },
    'cleanup_tasks': {
        'task': 'redash.tasks.cleanup_tasks',
        'schedule': timedelta(minutes=5)
    },
    'refresh_schemas': {
        'task': 'redash.tasks.refresh_schemas',
        'schedule': timedelta(minutes=settings.SCHEMAS_REFRESH_SCHEDULE)
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

celery.conf.update(CELERY_RESULT_BACKEND=settings.CELERY_BACKEND,
                   CELERYBEAT_SCHEDULE=celery_schedule,
                   CELERY_TIMEZONE='UTC',
                   CELERY_TASK_RESULT_EXPIRES=settings.CELERY_TASK_RESULT_EXPIRES)

if settings.SENTRY_DSN:
    from raven import Client
    from raven.contrib.celery import register_signal

    client = Client(settings.SENTRY_DSN, release=__version__)
    register_signal(client)


# Create a new Task base class, that pushes a new Flask app context to allow DB connections if needed.
TaskBase = celery.Task


class ContextTask(TaskBase):
    abstract = True

    def __call__(self, *args, **kwargs):
        with current_app.app_context():
            return TaskBase.__call__(self, *args, **kwargs)

celery.Task = ContextTask


# Create Flask app after forking a new worker, to make sure no resources are shared between processes.
@worker_process_init.connect
def init_celery_flask_app(**kwargs):
    app = create_app()
    app.app_context().push()

