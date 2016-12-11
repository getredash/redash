from redash import redis_connection, models, __version__, settings


def get_status():
    status = {}
    info = redis_connection.info()
    status['redis_used_memory'] = info['used_memory_human']
    status['version'] = __version__
    status['queries_count'] = models.db.session.query(models.Query).count()
    if settings.FEATURE_SHOW_QUERY_RESULTS_COUNT:
        status['query_results_count'] = models.db.session.query(models.QueryResult).count()
        status['unused_query_results_count'] = models.QueryResult.unused().count()
    status['dashboards_count'] = models.Dashboard.query.count()
    status['widgets_count'] = models.Widget.query.count()

    status['workers'] = []

    manager_status = redis_connection.hgetall('redash:status')
    status['manager'] = manager_status
    status['manager']['outdated_queries_count'] = len(models.Query.outdated_queries())

    queues = {}
    for ds in models.DataSource.query:
        for queue in (ds.queue_name, ds.scheduled_queue_name):
            queues.setdefault(queue, set())
            queues[queue].add(ds.name)

    status['manager']['queues'] = {}
    for queue, sources in queues.iteritems():
        status['manager']['queues'][queue] = {
            'data_sources': ', '.join(sources),
            'size': redis_connection.llen(queue)
        }

    return status
