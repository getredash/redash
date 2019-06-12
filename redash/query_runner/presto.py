from collections import defaultdict
from redash.query_runner import *
from redash.utils import json_dumps, json_loads

import logging
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
                'schema': {
                    'type': 'string'
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
            'order': ['host', 'protocol', 'port', 'username', 'password', 'schema', 'catalog'],
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

        results, error = self.run_query("SHOW SCHEMAS", None)
        if error is not None:
            raise Exception("Failed getting schema.")

        for schema_row in json_loads(results)['rows']:

            if schema_row['Schema'] in ['pg_catalog', 'information_schema']:
                continue

            query_tables = 'SHOW TABLES FROM "{}"'.format(schema_row['Schema'])
            results, error = self.run_query(query_tables, None)
            if error is not None:
                raise Exception("Failed getting schema. Failed executing {}".format(query_tables))

            for table_row in json_loads(results)['rows']:

                table_name = '{}.{}'.format(schema_row['Schema'], table_row['Table'])
                schema[table_name] = {'name': table_name, 'columns': []}

                query_columns = 'SHOW COLUMNS FROM "{}"."{}"'.format(schema_row['Schema'], table_row['Table'])
                results, error = self.run_query(query_columns, None)
                if error is not None:
                    schema.pop(table_name)
                    logger.warning(
                        "Failed getting columns for table {}, so skipping it. (probably it's an hive view :)".format(
                            table_name))
                else:
                    for column_row in json_loads(results)['rows']:
                        schema[table_name]['columns'].append(column_row['Column'])

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
