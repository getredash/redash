try:
    from pydruid.db import connect
    enabled = True
except ImportError:
    enabled = False

from redash.query_runner import BaseQueryRunner, register
from redash.utils import json_dumps, json_loads

TYPES_MAP = {
}

class Druid(BaseQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "username": {
                    "type": "string"
                },
                "password": {
                    "type": "string"
                },
                "host": {
                    "type": "string",
                    "default": "localhost"
                },
                "port": {
                    "type": "number",
                    "default": 8082
                },
                "scheme": {
                    "type": "string",
                    "default": "http"
                }
            },
            "order": ['scheme', 'host', 'port', 'username', 'password'],
            "required": ['host'],
            "secret": ["password"]
        }

    @classmethod
    def enabled(cls):
        return enabled

    def run_query(self, query, user):
        connection = connect(host=self.configuration['host'], port=self.configuration['port'], path='/druid/v2/sql/', scheme=self.configuration['scheme'])
        cursor = connection.cursor()

        try:
            cursor.execute(query)
            columns = self.fetch_columns([(i[0], TYPES_MAP.get(i[1], None)) for i in cursor.description])
            rows = [dict(zip((c['name'] for c in columns), row)) for row in cursor]

            data = {'columns': columns, 'rows': rows}
            error = None
            json_data = json_dumps(data)
            print(json_data)
        finally:
            connection.close()

        return json_data, error

register(Druid)