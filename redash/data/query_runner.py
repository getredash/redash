import json


def get_query_runner(connection_type, connection_string):
    if connection_type == 'mysql':
        from redash.data import query_runner_mysql
        runner = query_runner_mysql.mysql(connection_string)
    elif connection_type == 'graphite':
        from redash.data import query_runner_graphite
        connection_params = json.loads(connection_string)
        if connection_params['auth']:
            connection_params['auth'] = tuple(connection_params['auth'])
        else:
            connection_params['auth'] = None
        runner = query_runner_graphite.graphite(connection_params)
    elif connection_type == 'bigquery':
        from redash.data import query_runner_bigquery
        connection_params = json.loads(connection_string)
        runner = query_runner_bigquery.bigquery(connection_params)
    elif connection_type == 'script':
        from redash.data import query_runner_script
        runner = query_runner_script.script(connection_string)
    elif connection_type == 'url':
        from redash.data import query_runner_url
        runner = query_runner_url.url(connection_string)
    else:
        from redash.data import query_runner_pg
        runner = query_runner_pg.pg(connection_string)

    return runner