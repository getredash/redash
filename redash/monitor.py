import itertools
from sqlalchemy import union_all
from redash import redis_connection, __version__, settings
from redash.models import db, DataSource, Query, QueryResult, Dashboard, Widget
from redash.utils import json_loads
from redash.worker import celery


def get_redis_status():
    info = redis_connection.info()
    return {'redis_used_memory': info['used_memory'], 'redis_used_memory_human': info['used_memory_human']}


def get_object_counts():
    status = {}
    status['queries_count'] = Query.query.count()
    if settings.FEATURE_SHOW_QUERY_RESULTS_COUNT:
        status['query_results_count'] = QueryResult.query.count()
        status['unused_query_results_count'] = QueryResult.unused().count()
    status['dashboards_count'] = Dashboard.query.count()
    status['widgets_count'] = Widget.query.count()
    return status


def get_queues():
    queue_names = db.session.query(DataSource.queue_name).distinct()
    scheduled_queue_names = db.session.query(DataSource.scheduled_queue_name).distinct()
    query = db.session.execute(union_all(queue_names, scheduled_queue_names))

    return ['celery'] + [row[0] for row in query]


def get_queues_status():
    queues = {}

    for queue in get_queues():
        queues[queue] = {
            'size': redis_connection.llen(queue)
        }

    return queues


def get_db_sizes():
    database_metrics = []
    queries = [
        ['Query Results Size', "select pg_total_relation_size('query_results') as size from (select 1) as a"],
        ['Redash DB Size', "select pg_database_size('postgres') as size"]
    ]
    for query_name, query in queries:
        result = db.session.execute(query).first()
        database_metrics.append([query_name, result[0]])

    return database_metrics


def get_status():
    status = {
        'version': __version__,
        'workers': []
    }
    status.update(get_redis_status())
    status.update(get_object_counts())
    status['manager'] = redis_connection.hgetall('redash:status')
    status['manager']['queues'] = get_queues_status()
    status['database_metrics'] = {}
    status['database_metrics']['metrics'] = get_db_sizes()

    return status


def get_waiting_in_queue(queue_name):
    jobs = []
    for raw in redis_connection.lrange(queue_name, 0, -1):
        job = json_loads(raw)
        try:
            args = json_loads(job['headers']['argsrepr'])
            if args.get('query_id') == 'adhoc':
                args['query_id'] = None
        except ValueError:
            args = {}

        job_row = {
            'state': 'waiting_in_queue',
            'task_name': job['headers']['task'],
            'worker': None,
            'worker_pid': None,
            'start_time': None,
            'task_id': job['headers']['id'],
            'queue': job['properties']['delivery_info']['routing_key']
        }

        job_row.update(args)
        jobs.append(job_row)

    return jobs


def parse_tasks(task_lists, state):
    rows = []

    for task in itertools.chain(*task_lists.values()):
        task_row = {
            'state': state,
            'task_name': task['name'],
            'worker': task['hostname'],
            'queue': task['delivery_info']['routing_key'],
            'task_id': task['id'],
            'worker_pid': task['worker_pid'],
            'start_time': task['time_start'],
        }

        if task['name'] == 'redash.tasks.execute_query':
            try:
                args = json_loads(task['args'])
            except ValueError:
                args = {}

            if args.get('query_id') == 'adhoc':
                args['query_id'] = None

            task_row.update(args)

        rows.append(task_row)

    return rows


def celery_tasks():
    tasks = parse_tasks(celery.control.inspect().active(), 'active')
    tasks += parse_tasks(celery.control.inspect().reserved(), 'reserved')

    for queue_name in get_queues():
        tasks += get_waiting_in_queue(queue_name)

    return tasks
