from __future__ import absolute_import
from datetime import datetime, timedelta
from functools import partial
from random import randint

from rq_scheduler import Scheduler

from redash import settings, redis_connection
from redash.tasks import (sync_user_details, refresh_queries,
                          empty_schedules, refresh_schemas,
                          cleanup_query_results,
                          version_check, send_aggregated_errors)

rq_scheduler = Scheduler(connection=redis_connection,
                         queue_name="periodic",
                         interval=5)


def schedule(**kwargs):
    interval = kwargs['interval']
    if isinstance(interval, timedelta):
        interval = interval.seconds

    kwargs['interval'] = interval
    kwargs['result_ttl'] = kwargs.get('result_ttl', interval * 2)

    rq_scheduler.schedule(scheduled_time=datetime.utcnow(), **kwargs)


def schedule_periodic_jobs():
    for job in rq_scheduler.get_jobs():
        job.delete()

    jobs = [
        {"func": refresh_queries, "interval": 30},
        {"func": empty_schedules, "interval": timedelta(minutes=60)},
        {"func": refresh_schemas, "interval": timedelta(minutes=settings.SCHEMAS_REFRESH_SCHEDULE)},
        {"func": sync_user_details, "timeout": 60, "ttl": 45, "interval": timedelta(minutes=1)},
        {"func": send_aggregated_errors, "interval": timedelta(minutes=settings.SEND_FAILURE_EMAIL_INTERVAL)}
    ]

    if settings.QUERY_RESULTS_CLEANUP_ENABLED:
        jobs.append({"func": cleanup_query_results, "interval": timedelta(minutes=5)})

    if settings.VERSION_CHECK:
        # We schedule the version check to run at a random time in order to spread the requests from all users evenly.
        rq_scheduler.cron('{minute} {hour} * * *'.format(
            minute=randint(0, 59),
            hour=randint(0, 23)),
            func=version_check)

    # Add your own custom periodic jobs in your dynamic_settings module.
    jobs.extend(settings.dynamic_settings.periodic_jobs() or [])

    for job in jobs:
        schedule(**job)
