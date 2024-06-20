from funcy import flatten
from rq import Queue, Worker
from rq.job import Job
from rq.registry import StartedJobRegistry

from redash import __version__, redis_connection, rq_redis_connection, settings
from redash.models import Dashboard, Query, QueryResult, Widget, db


def get_redis_status():
    info = redis_connection.info()
    return {
        "redis_used_memory": info["used_memory"],
        "redis_used_memory_human": info["used_memory_human"],
    }


def get_object_counts():
    status = {}
    status["queries_count"] = Query.query.count()
    if settings.FEATURE_SHOW_QUERY_RESULTS_COUNT:
        status["query_results_count"] = QueryResult.query.count()
        status["unused_query_results_count"] = QueryResult.unused(settings.QUERY_RESULTS_CLEANUP_MAX_AGE).count()
    status["dashboards_count"] = Dashboard.query.count()
    status["widgets_count"] = Widget.query.count()
    return status


def get_queues_status():
    return {queue.name: {"size": len(queue)} for queue in Queue.all(connection=rq_redis_connection)}


def get_db_sizes():
    database_metrics = []
    queries = [
        [
            "Query Results Size",
            "select pg_total_relation_size('query_results') as size from (select 1) as a",
        ],
        ["Redash DB Size", "select pg_database_size(current_database()) as size"],
    ]
    for query_name, query in queries:
        result = db.session.execute(query).first()
        database_metrics.append([query_name, result[0]])

    return database_metrics


def get_status():
    status = {"version": __version__, "workers": []}
    status.update(get_redis_status())
    status.update(get_object_counts())
    status["manager"] = redis_connection.hgetall("redash:status")
    status["manager"]["queues"] = get_queues_status()
    status["database_metrics"] = {}
    status["database_metrics"]["metrics"] = get_db_sizes()

    return status


def rq_job_ids():
    queues = Queue.all(connection=rq_redis_connection)

    started_jobs = [StartedJobRegistry(queue=q).get_job_ids() for q in queues]
    queued_jobs = [q.job_ids for q in queues]

    return flatten(started_jobs + queued_jobs)


def fetch_jobs(job_ids):
    return [
        {
            "id": job.id,
            "name": job.func_name,
            "origin": job.origin,
            "enqueued_at": job.enqueued_at,
            "started_at": job.started_at,
            "meta": job.meta,
        }
        for job in Job.fetch_many(job_ids, connection=rq_redis_connection)
        if job is not None
    ]


def rq_queues():
    return {
        q.name: {
            "name": q.name,
            "started": fetch_jobs(StartedJobRegistry(queue=q).get_job_ids()),
            "queued": len(q.job_ids),
        }
        for q in sorted(Queue.all(), key=lambda q: q.name)
    }


def describe_job(job):
    return "{} ({})".format(job.id, job.func_name.split(".").pop()) if job else None


def rq_workers():
    return [
        {
            "name": w.name,
            "hostname": w.hostname,
            "pid": w.pid,
            "queues": ", ".join([q.name for q in w.queues]),
            "state": w.state,
            "last_heartbeat": w.last_heartbeat,
            "birth_date": w.birth_date,
            "current_job": describe_job(w.get_current_job()),
            "successful_jobs": w.successful_job_count,
            "failed_jobs": w.failed_job_count,
            "total_working_time": w.total_working_time,
        }
        for w in Worker.all()
    ]


def rq_status():
    return {"queues": rq_queues(), "workers": rq_workers()}
