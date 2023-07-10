from __future__ import absolute_import
import logging
import hashlib
import json
from datetime import datetime, timedelta

from rq.job import Job
from rq_scheduler import Scheduler

from redash import settings, rq_redis_connection, statsd_client
from redash.tasks import (
    sync_user_details,
    refresh_queries,
    remove_ghost_locks,
    empty_schedules,
    refresh_schemas,
    cleanup_query_results,
    version_check,
    send_aggregated_errors,
    Queue,
)

logger = logging.getLogger(__name__)


class StatsdRecordingScheduler(Scheduler):
    """
    RQ Scheduler Mixin that uses Redash's custom RQ Queue class to increment/modify metrics via Statsd
    """

    queue_class = Queue


rq_scheduler = StatsdRecordingScheduler(
    connection=rq_redis_connection, queue_name="periodic", interval=5
)


def job_id(kwargs):
    metadata = kwargs.copy()
    metadata["func"] = metadata["func"].__name__

    return hashlib.sha1(json.dumps(metadata, sort_keys=True).encode()).hexdigest()


def prep(kwargs):
    interval = kwargs["interval"]
    if isinstance(interval, timedelta):
        interval = int(interval.total_seconds())

    kwargs["interval"] = interval
    kwargs["result_ttl"] = kwargs.get("result_ttl", interval * 2)

    return kwargs


def schedule(kwargs):
    rq_scheduler.schedule(scheduled_time=datetime.utcnow(), id=job_id(kwargs), **kwargs)


def periodic_job_definitions():
    jobs = [
        {"func": refresh_queries, "timeout": 600, "interval": 30, "result_ttl": 600},
        {
            "func": remove_ghost_locks,
            "interval": timedelta(minutes=1),
            "result_ttl": 600,
        },
        {"func": empty_schedules, "interval": timedelta(minutes=60)},
        {
            "func": refresh_schemas,
            "interval": timedelta(minutes=settings.SCHEMAS_REFRESH_SCHEDULE),
        },      
        {
            "func": sync_user_details,
            "timeout": 60,
            "interval": timedelta(minutes=1),
            "result_ttl": 600,
        },
        {
            "func": send_aggregated_errors,
            "interval": timedelta(minutes=settings.SEND_FAILURE_EMAIL_INTERVAL),
        },
    ]

    if settings.VERSION_CHECK:
        jobs.append({"func": version_check, "interval": timedelta(days=1)})

    if settings.QUERY_RESULTS_CLEANUP_ENABLED:
        jobs.append({"func": cleanup_query_results, "interval": timedelta(minutes=5)})

    # Add your own custom periodic jobs in your dynamic_settings module.
    jobs.extend(settings.dynamic_settings.periodic_jobs() or [])

    return jobs


def schedule_periodic_jobs(jobs):
    job_definitions = [prep(job) for job in jobs]

    jobs_to_clean_up = Job.fetch_many(
        set([job.id for job in rq_scheduler.get_jobs()])
        - set([job_id(job) for job in job_definitions]),
        rq_redis_connection,
    )

    jobs_to_schedule = [
        job for job in job_definitions if job_id(job) not in rq_scheduler
    ]

    for job in jobs_to_clean_up:
        logger.info("Removing %s (%s) from schedule.", job.id, job.func_name)
        rq_scheduler.cancel(job)
        job.delete()

    for job in jobs_to_schedule:
        logger.info(
            "Scheduling %s (%s) with interval %s.",
            job_id(job),
            job["func"].__name__,
            job.get("interval"),
        )
        schedule(job)
