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
        if not result_columns:
            for c in result.raw['series'][0]['columns']:
                result_columns.append({ "name": c })

        for point in result.get_points():
            result_rows.append(point)

    return json.dumps({
        "columns" : result_columns,
        "rows" : result_rows
    }, cls=JSONEncoder)


class InfluxDB(BaseQueryRunner):
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

    def run_query(self, query):
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
