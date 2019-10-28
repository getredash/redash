from redash.query_runner import BaseQueryRunner, register
from redash.query_runner import TYPE_STRING, TYPE_DATE, TYPE_DATETIME, TYPE_INTEGER, TYPE_FLOAT, TYPE_BOOLEAN
from redash.utils import json_dumps, json_loads
import pyodbc

enabled = True

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


class Dremio(BaseQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "driver": {
                    "type": "string",
                    "default": "{Dremio ODBC Driver 64-bit}"
                },
                "host": {
                    "type": "string"
                },
                "port": {
                    "type": "string",
                    "default": "31010"
                },
                "user": {
                    "type": "string"
                },
                "password": {
                    "type": "string"
                },
            },
            "order": ["driver", "host", "port", "user", "password"],
            "required": ["user", "password", "host", "port", "driver"],
            "secret": ["password"]
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def determine_type(cls, data_type, scale):
        t = TYPES_MAP.get(data_type, None)
        if t == TYPE_INTEGER and scale > 0:
            return TYPE_FLOAT
        return t

    def run_query(self, query, user):

        connection = pyodbc.connect(
            "Driver={};ConnectionType=Direct;HOST={};PORT={};AuthenticationType=Plain;UID={};PWD={}".format(
                self.configuration['driver'],
                self.configuration['host'],
                self.configuration['port'],
                self.configuration['user'],
                self.configuration['password']
            ),
            autocommit=True
        )

        cursor = connection.cursor()

        try:
            cursor.execute(query)

            columns = self.fetch_columns(
                [(i[0], self.determine_type(i[1], i[5])) for i in cursor.description])
            rows = [dict(zip((column['name'] for column in columns), row))
                    for row in cursor]

            data = {'columns': columns, 'rows': rows}
            error = None
            json_data = json_dumps(data)
        finally:
            cursor.close()
            connection.close()

        return json_data, error

    def get_schema(self, get_stats=False):
        query = """
        select * from INFORMATION_SCHEMA.COLUMNS
        where not REGEXP_LIKE(TABLE_SCHEMA, '^(sys|__accelerator|INFORMATION_SCHEMA|Samples).*')
        """

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        schema = {}
        results = json_loads(results)

        for row in results['rows']:
            table_name = '{}.{}'.format(row['TABLE_SCHEMA'], row['TABLE_NAME'])

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['COLUMN_NAME'])

        return list(schema.values())


register(Dremio)
