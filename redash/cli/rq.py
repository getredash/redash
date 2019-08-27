from __future__ import absolute_import
from datetime import datetime
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

SECONDS = 1
MINUTES = 60 * SECONDS

manager = AppGroup(help="RQ management commands.")


@manager.command()
def scheduler():
    scheduler = Scheduler(connection=redis_connection,
                          queue_name="periodic_jobs",
                          interval=5)

    scheduler.schedule(scheduled_time=datetime.utcnow(),
                       func=refresh_queries,
                       interval=30 * SECONDS)

    scheduler.schedule(scheduled_time=datetime.utcnow(),
                       func=empty_schedules,
                       interval=60 * MINUTES)

    scheduler.schedule(scheduled_time=datetime.utcnow(),
                       func=refresh_schemas,
                       interval=settings.SCHEMAS_REFRESH_SCHEDULE * MINUTES)

    scheduler.schedule(scheduled_time=datetime.utcnow(),
                       func=sync_user_details,
                       timeout=60 * SECONDS,
                       ttl=45 * SECONDS,
                       interval=1 * MINUTES)

    scheduler.schedule(scheduled_time=datetime.utcnow(),
                       func=send_aggregated_errors,
                       interval=settings.SEND_FAILURE_EMAIL_INTERVAL * MINUTES)

    if settings.VERSION_CHECK:
        # We need to schedule the version check to run at a random hour/minute, to spread the requests from all users evenly.
        scheduler.cron('{minute} {hour} * * *'.format(
            minute=randint(0, 59),
            hour=randint(0, 23)),
            func=version_check)

    if settings.QUERY_RESULTS_CLEANUP_ENABLED:
        scheduler.schedule(scheduled_time=datetime.utcnow(),
                           func=cleanup_query_results,
                           interval=5 * MINUTES)

    scheduler.run()


@manager.command()
@argument('queues')
def worker(queues='default'):
    with Connection(redis_connection):
        w = Worker(queues)
        w.work()
