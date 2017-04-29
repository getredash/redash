import json
import logging

from redash.utils import JSONEncoder
from redash.query_runner import *

logger = logging.getLogger(__name__)

try:
    from influxdb import InfluxDBClusterClient
    enabled = True

except ImportError:
    enabled = False


def _transform_result(results):
    result_columns = []
    result_rows = []

    for result in results:
        for series in result.raw.get('series', []):
            for column in series['columns']:
                if column not in result_columns:
                    result_columns.append(column)
            tags = series.get('tags', {})
            for key in tags.keys():
                if key not in result_columns:
                    result_columns.append(key)

    for result in results:
        for series in result.raw.get('series', []):
            for point in series['values']:
                result_row = {}
                for column in result_columns:
                    tags = series.get('tags', {})
                    if column in tags:
                        result_row[column] = tags[column]
                    elif column in series['columns']:
                        index = series['columns'].index(column)
                        value = point[index]
                        result_row[column] = value
                result_rows.append(result_row)

    return json.dumps({
        "columns": [{'name': c} for c in result_columns],
        "rows": result_rows
    }, cls=JSONEncoder)


class InfluxDB(BaseQueryRunner):
    noop_query = "show databases"

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'url': {
                    'type': 'string'
                }
            },
            'required': ['url']
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def type(cls):
        return "influxdb"

    def __init__(self, configuration):
        super(InfluxDB, self).__init__(configuration)

    def run_query(self, query, user):
        client = InfluxDBClusterClient.from_DSN(self.configuration['url'])

        logger.debug("influxdb url: %s", self.configuration['url'])
        logger.debug("influxdb got query: %s", query)

        try:
            results = client.query(query)
            if not isinstance(results, list):
                results = [results]

            json_data = _transform_result(results)
            error = None
        except Exception, ex:
            json_data = None
            error = ex.message

        return json_data, error


register(InfluxDB)
