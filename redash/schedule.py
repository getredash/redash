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


def _schedule(func, **kwargs):
    previously_scheduled_jobs = filter(lambda job: job.func == func, rq_scheduler.get_jobs())
    for job in previously_scheduled_jobs:
        rq_scheduler.cancel(job)

    interval = kwargs['interval']
    if isinstance(interval, timedelta):
        interval = interval.seconds

    kwargs['interval'] = interval
    kwargs['result_ttl'] = kwargs.get('result_ttl', interval)

    rq_scheduler.schedule(scheduled_time=datetime.utcnow(), func=func, **kwargs)


def schedule_periodic_jobs():
    _schedule(refresh_queries, interval=30)
    _schedule(empty_schedules, interval=timedelta(minutes=60))
    _schedule(refresh_schemas, interval=timedelta(minutes=settings.SCHEMAS_REFRESH_SCHEDULE))
    _schedule(sync_user_details, timeout=60, ttl=45, interval=timedelta(minutes=1))
    _schedule(send_aggregated_errors, interval=timedelta(minutes=settings.SEND_FAILURE_EMAIL_INTERVAL))

    for (func, kwargs) in settings.dynamic_settings.custom_tasks().iteritems():
        _schedule(func, **kwargs)

    if settings.QUERY_RESULTS_CLEANUP_ENABLED:
        _schedule(cleanup_query_results, interval=timedelta(minutes=5))

    if settings.VERSION_CHECK:
        # We need to schedule the version check to run at a random hour/minute, to spread the requests from all users evenly.
        rq_scheduler.cron('{minute} {hour} * * *'.format(
            minute=randint(0, 59),
            hour=randint(0, 23)),
            func=version_check)
