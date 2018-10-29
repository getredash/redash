from redash.query_runner import *
from redash.utils import json_dumps, json_loads

import logging
logger = logging.getLogger(__name__)

from collections import defaultdict

try:
    from pyhive import presto
    from pyhive.exc import DatabaseError
    enabled = True

except ImportError:
    enabled = False

PRESTO_TYPES_MAPPING = {
    "integer": TYPE_INTEGER,
    "tinyint": TYPE_INTEGER,
    "smallint": TYPE_INTEGER,
    "long": TYPE_INTEGER,
    "bigint": TYPE_INTEGER,
    "float": TYPE_FLOAT,
    "double": TYPE_FLOAT,
    "boolean": TYPE_BOOLEAN,
    "string": TYPE_STRING,
    "varchar": TYPE_STRING,
    "date": TYPE_DATE,
}


def format_schema(results):
    """
    This function formats the schema, table, and columns of Athena and Presto
    for display in the UI schema browser.
    """
    schema = {}
    for row in results['rows']:
        column_list = []
        table_name = '{}.{}'.format(row['table_schema'], row['table_name'])
        if table_name not in schema:
            schema[table_name] = {'name': table_name, columns: []}
        column_list.append({
            'column_name': row['column_name'],
            'extra_info': row['extra_info'],
            'column_type': row['column_type']
        })
        schema[table_name]['columns'] = columns_list[0]
    return schema


class Presto(BaseQueryRunner):
    noop_query = 'SHOW TABLES'

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'host': {
                    'type': 'string'
                },
                'protocol': {
                    'type': 'string',
                    'default': 'http'
                },
                'port': {
                    'type': 'number'
                },
                'schema': {
                    'type': 'string'
                },
                'catalog': {
                    'type': 'string'
                },
                'username': {
                    'type': 'string'
                },
            },
            'order': ['host', 'protocol', 'port', 'username', 'schema', 'catalog'],
            'required': ['host']
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def type(cls):
        return "presto"

    def get_schema(self, get_stats=False):
        schema = {}
        query = """
        SELECT table_schema, table_name, column_name, data_type as column_type, extra_info
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        """

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        schema = format_schema(json.loads(results))

        return schema.values()

    def run_query(self, query, user):
        connection = presto.connect(
                host=self.configuration.get('host', ''),
                port=self.configuration.get('port', 8080),
                protocol=self.configuration.get('protocol', 'http'),
                username=self.configuration.get('username', 'redash'),
                catalog=self.configuration.get('catalog', 'hive'),
                schema=self.configuration.get('schema', 'default'))

        cursor = connection.cursor()


        try:
            cursor.execute(query)
            column_tuples = [(i[0], PRESTO_TYPES_MAPPING.get(i[1], None)) for i in cursor.description]
            columns = self.fetch_columns(column_tuples)
            rows = [dict(zip(([c['name'] for c in columns]), r)) for i, r in enumerate(cursor.fetchall())]
            data = {'columns': columns, 'rows': rows}
            json_data = json_dumps(data)
            error = None
        except DatabaseError as db:
            json_data = None
            default_message = 'Unspecified DatabaseError: {0}'.format(db.message)
            if isinstance(db.message, dict):
                message = db.message.get('failureInfo', {'message', None}).get('message')
            else:
                message = None
            error = default_message if message is None else message
        except (KeyboardInterrupt, InterruptException) as e:
            cursor.cancel()
            error = "Query cancelled by user."
            json_data = None
        except Exception as ex:
            json_data = None
            error = ex.message
            if not isinstance(error, basestring):
                error = unicode(error)

        return json_data, error

register(Presto)
