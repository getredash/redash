import ast
import itertools
import json
import base64
from redash import redis_connection, models, __version__, settings
from redash.worker import celery


def get_redis_status():
    info = redis_connection.info()
    return {'redis_used_memory': info['used_memory'], 'redis_used_memory_human': info['used_memory_human']}


def get_object_counts():
    status = {}
    status['queries_count'] = models.Query.query.count()
    if settings.FEATURE_SHOW_QUERY_RESULTS_COUNT:
        status['query_results_count'] = models.QueryResult.query.count()
        status['unused_query_results_count'] = models.QueryResult.unused().count()
    status['dashboards_count'] = models.Dashboard.query.count()
    status['widgets_count'] = models.Widget.query.count()
    return status


def get_queues():
    queues = {}
    for ds in models.DataSource.query:
        for queue in (ds.queue_name, ds.scheduled_queue_name):
            queues.setdefault(queue, set())
            queues[queue].add(ds.name)

    return queues


def get_queues_status():
    queues = get_queues()

    for queue, sources in queues.iteritems():
        queues[queue] = {
            'data_sources': ', '.join(sources),
            'size': redis_connection.llen(queue)
        }

    queues['celery'] = {
        'size': redis_connection.llen('celery'),
        'data_sources': ''
    }

    return queues


def get_db_sizes():
    database_metrics = []
    queries = [
        ['Query Results Size', "select pg_total_relation_size('query_results') as size from (select 1) as a"],
        ['Redash DB Size', "select pg_database_size('postgres') as size"]
    ]
    for query_name, query in queries:
        result = models.db.session.execute(query).first()
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


def parse_task(task, state):
    return {
        'type': task['name'],
        'state': state,
        'worker': task['hostname'],
        'queue': task['delivery_info']['routing_key'],
        'task_id': task['id'],
        'started_at': task.get('time_start')
    }

def parse_execute_query_task(task, state):
    args = ast.literal_eval(task['args'])
    data_source_id = args[1]
    query_id = args[2].get('Query ID')
    user = args[2].get('Username')
    if query_id == 'adhoc':
        query_id = None
    
    parsed = parse_task(task, state)

    parsed.update({
        'data_source_id': data_source_id,
        'query_id': query_id,
        'username': user,
    })

    return parsed


def parse_control_tasks_list(tasks, tasks_state):
    query_tasks = []

    if tasks is None:
        return query_tasks

    for task in itertools.chain(*tasks.values()):
        if task['name'] == 'redash.tasks.execute_query':
            query_tasks.append(parse_execute_query_task(task, tasks_state))
        else:
            query_tasks.append(parse_task(task, tasks_state))


    return query_tasks


def waiting_tasks():
    query_tasks = []
    for queue_name in get_queues():
        for raw in redis_connection.lrange(queue_name, 0, -1):
            job = json.loads(raw)
            job['body'] = json.loads(base64.b64decode(job['body']))

            query, data_source_id, metadata, user_id, scheduled_query_id = job['body'][0]

            query_tasks.append({
                'state': 'waiting',
                'worker': None,
                'queue': queue_name,
                'task_id': job['headers']['id'],
                'data_source_id': data_source_id,
                'query_id': metadata.get('Query ID'),
                'username': metadata.get('Username'),
            })
    
    return query_tasks


def active_tasks():
    return parse_control_tasks_list(celery.control.inspect().active(), 'active')


def reserved_tasks():
    return parse_control_tasks_list(celery.control.inspect().reserved(), 'reserved')
