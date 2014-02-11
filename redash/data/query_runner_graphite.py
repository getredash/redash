"""
QueryRunner for Graphite.
"""
import json
import datetime
import requests
from redash.utils import JSONEncoder


def graphite(connection_params):
    def transform_result(response):
        columns = [{'name': 'Time::x'}, {'name': 'value::y'}, {'name': 'name::series'}]
        rows = []

        for series in response.json():
            for values in series['datapoints']:
                timestamp = datetime.datetime.fromtimestamp(int(values[1]))
                rows.append({'Time::x': timestamp, 'name::series': series['target'], 'value::y': values[0]})

        data = {'columns': columns, 'rows': rows}
        return json.dumps(data, cls=JSONEncoder)

    def query_runner(query):
        base_url = "%s/render?format=json&" % connection_params['url']
        url = "%s%s" % (base_url, "&".join(query.split("\n")))
        error = None
        data = None

        try:
            response = requests.get(url, auth=connection_params['auth'],
                                    verify=connection_params['verify'])

            if response.status_code == 200:
                data = transform_result(response)
            else:
                error = "Failed getting results (%d)" % response.status_code

        except Exception, ex:
            data = None
            error = ex.message

        return data, error

    query_runner.annotate_query = False

    return query_runner