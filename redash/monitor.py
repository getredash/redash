from redash import redis_connection, models, __version__, settings


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
