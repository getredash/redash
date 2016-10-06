from __future__ import absolute_import

from random import randint
from celery import Celery
from datetime import timedelta
from celery.schedules import crontab
from redash import settings, __version__
from redash.metrics import celery


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
    from raven.contrib.celery import register_signal, register_logger_signal

    client = Client(settings.SENTRY_DSN, release=__version__)
    register_signal(client)


