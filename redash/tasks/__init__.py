from .general import (
    record_event,
    version_check,
    send_mail,
    sync_user_details,
    purge_failed_jobs,
)
from .queries import (
    enqueue_query,
    execute_query,
    refresh_queries,
    refresh_schemas,
    cleanup_query_results,
    empty_schedules,
)
from .alerts import check_alerts_for_query
from .failure_report import send_aggregated_errors
from .worker import Worker, Queue, Job
from .schedule import rq_scheduler, schedule_periodic_jobs, periodic_job_definitions

from redash import rq_redis_connection
from rq.connections import push_connection, pop_connection


def init_app(app):
    app.before_request(lambda: push_connection(rq_redis_connection))
    app.teardown_request(lambda _: pop_connection())

