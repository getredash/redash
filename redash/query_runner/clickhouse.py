import json
import logging
from redash.query_runner import *
from redash.utils import JSONEncoder
import requests
logger = logging.getLogger(__name__)


class ClickHouse(BaseSQLQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "default": "http://127.0.0.1:8123"
                },
                "user": {
                    "type": "string",
                    "default": "default"
                },
                "password": {
                    "type": "string"
                },
                "dbname": {
                    "type": "string",
                    "title": "Database Name"
                }
            },
            "required": ["dbname"],
            "secret": ["password"]
        }

    @classmethod
    def type(cls):
        return "clickhouse"

    def __init__(self, configuration):
        super(ClickHouse, self).__init__(configuration)

    def _get_tables(self, schema):
        query = "SELECT database, table, name FROM system.columns WHERE database NOT IN ('system')"

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json.loads(results)

        for row in results['rows']:
            table_name = '{}.{}'.format(row['database'], row['table'])

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['name'])

        return schema.values()

    def _send_query(self, data, stream=False):
        r = requests.post(self.configuration['url'], data=data.encode("utf-8"), stream=stream, params={
            'user': self.configuration['user'], 'password':  self.configuration['password'],
            'database': self.configuration['dbname']
        })
        if r.status_code != 200:
            raise Exception(r.text)
        # logging.warning(r.json())
        return r.json()

    @staticmethod
    def _define_column_type(column):
        c = column.lower()
        if 'int' in c:
            return TYPE_INTEGER
        elif 'float' in c:
            return TYPE_FLOAT
        elif 'datetime' == c:
            return TYPE_DATETIME
        elif 'date' == c:
            return TYPE_DATE
        else:
            return TYPE_STRING

    def _clickhouse_query(self, query):
        query += ' FORMAT JSON'
        result = self._send_query(query)
        columns = [{'name': r['name'], 'friendly_name': r['name'],
                    'type': self._define_column_type(r['type'])} for r in result['meta']]
        # db converts value to string if its type equals UInt64
        columns_uint64 = [r['name'] for r in result['meta'] if r['type'] == 'UInt64']
        rows = result['data']
        for row in rows:
            for column in columns_uint64:
                row[column] = int(row[column])
        return {'columns': columns, 'rows': rows}

    def run_query(self, query, user):
        logger.debug("Clickhouse is about to execute query: %s", query)
        if query == "":
            json_data = None
            error = "Query is empty"
            return json_data, error
        try:
            q = self._clickhouse_query(query)
            data = json.dumps(q, cls=JSONEncoder)
            error = None
        except Exception as e:
            data = None
            logging.exception(e)
            error = unicode(e)
        return data, error

register(ClickHouse)
