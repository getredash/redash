from __future__ import absolute_import
from datetime import datetime, timedelta
from random import randint

from redash import redis_connection, settings
from redash.tasks import (sync_user_details, refresh_queries,
                          empty_schedules, refresh_schemas,
                          cleanup_query_results,
                          version_check, send_aggregated_errors)

from click import argument
from flask.cli import AppGroup
from rq import Connection, Worker
from rq_scheduler import Scheduler

manager = AppGroup(help="RQ management commands.")


@manager.command()
def scheduler():
    scheduler = Scheduler(connection=redis_connection,
                          queue_name="periodic_jobs",
                          interval=5)

    def schedule(func, **kwargs):
        kwargs['interval'] = kwargs['interval'].seconds if isinstance(kwargs['interval'], timedelta) else kwargs['interval']
        scheduler.schedule(scheduled_time=datetime.utcnow(), func=func, **kwargs)

    schedule(refresh_queries, interval=30)
    schedule(empty_schedules, interval=timedelta(minutes=60))
    schedule(refresh_schemas, interval=timedelta(minutes=settings.SCHEMAS_REFRESH_SCHEDULE))
    schedule(sync_user_details, timeout=60, ttl=45, interval=timedelta(minutes=1))
    schedule(send_aggregated_errors, interval=timedelta(minutes=settings.SEND_FAILURE_EMAIL_INTERVAL))
    
    for (func, kwargs) in settings.dynamic_settings.custom_tasks().iteritems():
        schedule(func, **kwargs)

    if settings.QUERY_RESULTS_CLEANUP_ENABLED:
        schedule(cleanup_query_results, interval=timedelta(minutes=5))

    if settings.VERSION_CHECK:
        # We need to schedule the version check to run at a random hour/minute, to spread the requests from all users evenly.
        scheduler.cron('{minute} {hour} * * *'.format(
            minute=randint(0, 59),
            hour=randint(0, 23)),
            func=version_check)

    scheduler.run()


@manager.command()
@argument('queues', nargs=-1)
def worker(queues='default'):
    with Connection(redis_connection):
        w = Worker(queues)
        w.work()
