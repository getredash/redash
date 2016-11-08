from markupsafe import escape

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


class Presto(BaseQueryRunner):
    noop_query = 'SHOW TABLES'
    configuration_properties = {
        'host': {
            'type': 'string'
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
        "toggle_table_string": {
            "type": "string",
            "title": "Toggle Table String",
            "default": "_v",
            "info": "This string will be used to toggle visibility of tables in the schema browser when editing a query in order to remove non-useful tables from sight."
        },
    }

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': cls.configuration_properties,
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
        ORDER BY 1, 5 DESC
        """

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json_loads(results)

        for row in results['rows']:
            table_name = '{}.{}'.format(row['table_schema'], row['table_name'])

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            if row['extra_info'] == 'partition key':
                schema[table_name]['columns'].append('[P] ' + row['column_name'] + ' (' + row['column_type'] + ')')
            elif row['column_type'] == 'integer' or row['column_type'] == 'varchar' or row['column_type'] == 'timestamp' or row['column_type'] == 'boolean' or row['column_type'] == 'bigint':
                schema[table_name]['columns'].append(row['column_name'] + ' (' + row['column_type'] + ')')
            elif row['column_type'][0:2] == 'row' or row['column_type'][0:2] == 'map' or row['column_type'][0:2] == 'arr':
                schema[table_name]['columns'].append(row['column_name'] + ' (row or map or array)')
            else:
                schema[table_name]['columns'].append(row['column_name'])

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
            for row in rows:
                for field in row:
                    field = escape(field)
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
