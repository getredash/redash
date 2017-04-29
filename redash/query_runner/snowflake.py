from __future__ import absolute_import
import json

try:
    import snowflake.connector
    enabled = True
except ImportError:
    enabled = False


from redash.query_runner import BaseQueryRunner, register
from redash.query_runner import TYPE_STRING, TYPE_DATE, TYPE_DATETIME, TYPE_INTEGER, TYPE_FLOAT, TYPE_BOOLEAN
from redash.utils import json_dumps

TYPES_MAP = {
    0: TYPE_INTEGER,
    1: TYPE_FLOAT,
    2: TYPE_STRING,
    3: TYPE_DATE,
    4: TYPE_DATETIME,
    5: TYPE_STRING,
    6: TYPE_DATETIME,
    13: TYPE_BOOLEAN
}


class Snowflake(BaseQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "account": {
                    "type": "string"
                },
                "user": {
                    "type": "string"
                },
                "password": {
                    "type": "string"
                },
                "warehouse": {
                    "type": "string"
                },
                "database": {
                    "type": "string"
                }
            },
            "required": ["user", "password", "account", "database", "warehouse"],
            "secret": ["password"]
        }

    @classmethod
    def enabled(cls):
        return enabled

    def run_query(self, query, user):
        connection = snowflake.connector.connect(
            user=self.configuration['user'],
            password=self.configuration['password'],
            account=self.configuration['account'],
        )

        cursor = connection.cursor()

        try:
            cursor.execute("USE WAREHOUSE {}".format(self.configuration['warehouse']))
            cursor.execute("USE {}".format(self.configuration['database']))

            cursor.execute(query)

            columns = self.fetch_columns([(i[0], TYPES_MAP.get(i[1], None)) for i in cursor.description])
            rows = [dict(zip((c['name'] for c in columns), row)) for row in cursor]

            data = {'columns': columns, 'rows': rows}
            error = None
            json_data = json_dumps(data)
        finally:
            cursor.close()
            connection.close()

        return json_data, error

    def get_schema(self, get_stats=False):
        query = """
        SELECT col.table_schema,
               col.table_name,
               col.column_name
        FROM {database}.information_schema.columns col
        WHERE col.table_schema <> 'INFORMATION_SCHEMA'
        """.format(database=self.configuration['database'])

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        schema = {}
        results = json.loads(results)

        for row in results['rows']:
            table_name = '{}.{}'.format(row['TABLE_SCHEMA'], row['TABLE_NAME'])

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['COLUMN_NAME'])

        return schema.values()

register(Snowflake)
