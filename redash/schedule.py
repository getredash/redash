from __future__ import absolute_import
import logging
from datetime import datetime, timedelta
from functools import partial
from random import randint

from rq import Connection, Queue
from rq.registry import FailedJobRegistry
from rq_scheduler import Scheduler

from redash import settings, rq_redis_connection
from redash.tasks import (sync_user_details, refresh_queries,
                          empty_schedules, refresh_schemas,
                          cleanup_query_results,
                          version_check, send_aggregated_errors)

logger = logging.getLogger(__name__)

rq_scheduler = Scheduler(connection=rq_redis_connection,
                         queue_name="periodic",
                         interval=5)


def schedule(**kwargs):
    interval = kwargs['interval']
    if isinstance(interval, timedelta):
        interval = interval.seconds

    kwargs['interval'] = interval
    kwargs['result_ttl'] = kwargs.get('result_ttl', interval * 2)

    rq_scheduler.schedule(scheduled_time=datetime.utcnow(), **kwargs)


def clean_failed_jobs():
    jobs = rq_redis_connection.scan_iter('rq:job:*')

    is_idle = lambda key: rq_redis_connection.object('idletime', key) > settings.JOB_DEFAULT_FAILURE_TTL
    has_failed = lambda key: rq_redis_connection.hget(key, 'status') == b'failed'

    def not_in_any_failed_registry(key):
        return True # remove this line once once https://github.com/rq/rq/pull/1130 is released.

        with Connection(rq_redis_connection):
            failed_registries = [FailedJobRegistry(queue=q) for q in Queue.all()]

        job_id = lambda key : key.decode().split(':').pop()
        return all([job_id(key) not in registry for registry in failed_registries])

    stale_jobs = [key for key in jobs if is_idle(key) and has_failed(key) and not_in_any_failed_registry(key)]

    for key in stale_jobs:
        rq_redis_connection.delete(key)

    logging.info('Cleaned %d old failed jobs.', len(stale_jobs))


def schedule_periodic_jobs():
    for job in rq_scheduler.get_jobs():
        job.delete()

    jobs = [
        {"func": refresh_queries, "interval": 30, "result_ttl": 600},
        {"func": empty_schedules, "interval": timedelta(minutes=60)},
        {"func": refresh_schemas, "interval": timedelta(minutes=settings.SCHEMAS_REFRESH_SCHEDULE)},
        {"func": sync_user_details, "timeout": 60, "ttl": 45, "interval": timedelta(minutes=1)},
        {"func": clean_failed_jobs, "interval": timedelta(days=1)},
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
        logger.info("Scheduling %s with interval %s.", job['func'].__name__, job.get('interval'))
        schedule(**job)
