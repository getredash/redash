import re
import logging

from collections import defaultdict
from redash.query_runner import *
from redash.utils import json_dumps, json_loads


logger = logging.getLogger(__name__)


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
                'default_schema': {
                    'type': 'string'
                },
                'schema_filter': {
                    'type': 'string',
                    'default': 'RegExp to filter schema name'
                },
                'table_filter': {
                    'type': 'string',
                    'default': 'RegExp to filter schema.table'
                },
                'catalog': {
                    'type': 'string'
                },
                'username': {
                    'type': 'string'
                },
                'password': {
                    'type': 'string'
                },
            },
            'order': ['host', 'protocol', 'port', 'username', 'password',
                      'default_schema', 'schema_filter', 'table_filter', 'catalog'],
            'required': ['host']
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def type(cls):
        return "presto"

    def get_rows(self, query, colnames):
        """Return query results as a list of tuples"""
        results, error = self.run_query(query, None)
        # Skip null StorageFormat error
        if error == 'outputFormat should not be accessed from a null StorageFormat':
            return []
        if error is not None:
            raise Exception("Failed getting schema.")
        results = json_loads(results)
        return [tuple(row[col] for col in colnames) for row in results["rows"]]

    def get_schema(self, get_stats=False):
        schema = {}
        catalog = self.configuration.get('catalog', 'hive')
        table_filter = self.configuration.get('table_filter', '')
        schema_filter = re.compile(self.configuration.get('schema_filter', ''))

        for (schem, ) in self.get_rows("SHOW SCHEMAS", ["Schema"]):
            if not schema_filter.match(schem):
                continue
            query = """
                SELECT
                    table_name, column_name
                FROM system.jdbc.columns
                WHERE table_cat = '{catalog}'
                    AND regexp_like(concat(table_schem, '.', table_name), '{table_filter}')
                    AND table_schem = '{schem}'
            """.format(catalog=catalog, schem=schem, table_filter=table_filter)

            for (tbl, col) in self.get_rows(query, ("table_name", "column_name")):
                table_name = '{}.{}'.format(schem, tbl)
                if table_name not in schema:
                    schema[table_name] = {'name': table_name, 'columns': []}
                schema[table_name]['columns'].append(col)

        return schema.values()

    def run_query(self, query, user):
        connection = presto.connect(
            host=self.configuration.get('host', ''),
            port=self.configuration.get('port', 8080),
            protocol=self.configuration.get('protocol', 'http'),
            username=self.configuration.get('username', 'redash'),
            password=(self.configuration.get('password') or None),
            catalog=self.configuration.get('catalog', 'hive'),
            schema=self.configuration.get('schema', 'default'))

        cursor = connection.cursor()

        try:
            cursor.execute(query)
            column_tuples = [(i[0], PRESTO_TYPES_MAPPING.get(i[1], None))
                             for i in cursor.description]
            columns = self.fetch_columns(column_tuples)
            rows = [dict(zip(([c['name'] for c in columns]), r))
                    for i, r in enumerate(cursor.fetchall())]
            data = {'columns': columns, 'rows': rows}
            json_data = json_dumps(data)
            error = None
        except DatabaseError as db:
            json_data = None
            default_message = 'Unspecified DatabaseError: {0}'.format(
                db.message)
            if isinstance(db.message, dict):
                message = db.message.get(
                    'failureInfo', {'message', None}).get('message')
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
