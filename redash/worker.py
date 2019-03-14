from __future__ import absolute_import
from datetime import timedelta
from random import randint

from flask import current_app

from celery import Celery
from celery.schedules import crontab
from celery.signals import worker_process_init
from celery.utils.log import get_logger
from importlib_metadata import entry_points

from redash import create_app, settings
from redash.metrics import celery as celery_metrics  # noqa


logger = get_logger(__name__)

# The periodic Celery tasks as provided by Redash extensions.
# This is separate from the internal periodic Celery tasks in
# celery_schedule since the extension task discovery phase is
# after the configuration has already happened.
extensions_schedule = {}


celery = Celery('redash',
                broker=settings.CELERY_BROKER,
                include='redash.tasks')

# The internal periodic Celery tasks to automatically schedule.
celery_schedule = {
    'refresh_queries': {
        'task': 'redash.tasks.refresh_queries',
        'schedule': timedelta(seconds=30)
    },
    'refresh_schemas': {
        'task': 'redash.tasks.refresh_schemas',
        'schedule': timedelta(minutes=settings.SCHEMAS_REFRESH_SCHEDULE)
    },
    'sync_user_details': {
        'task': 'redash.tasks.sync_user_details',
        'schedule': timedelta(minutes=1),
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

celery.conf.update(result_backend=settings.CELERY_RESULT_BACKEND,
                   beat_schedule=celery_schedule,
                   timezone='UTC',
                   result_expires=settings.CELERY_RESULT_EXPIRES,
                   worker_log_format=settings.CELERYD_WORKER_LOG_FORMAT,
                   worker_task_log_format=settings.CELERYD_WORKER_TASK_LOG_FORMAT)


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
    """Load the periodic tasks as defined in Redash extensions.

    The periodic task entry point needs to return a set of parameters
    that can be passed to Celery's add_periodic_task:

        https://docs.celeryproject.org/en/latest/userguide/periodic-tasks.html#entries

    E.g.::

        def add_two_and_two():
            return {
                'name': 'add 2 and 2 every 10 seconds'
                'sig': add.s(2, 2),
                'schedule': 10.0,  # in seconds or a timedelta
            }

    and then registered with an entry point under the "redash.periodic_tasks"
    group, e.g. in your setup.py::

        setup(
            # ...
            entry_points={
                "redash.periodic_tasks": [
                    "add_two_and_two = calculus.addition:add_two_and_two",
                ]
                # ...
            },
            # ...
        )
    """
    for entry_point in entry_points().get('redash.periodic_tasks', []):
        logger.info('Loading periodic Redash tasks %s from %s.', entry_point.name, entry_point.value)
        try:
            params = entry_point.load()
            # Keep a record of our periodic tasks
            extensions_schedule[entry_point.name] = params
            # and add it to Celery's periodic task registry, too.
            sender.add_periodic_task(**params)
        except (ImportError, AttributeError):
            # and move on if it couldn't load it
            logger.error('Periodic Redash task %s could not be found at %s.', entry_point.name, entry_point.value)
