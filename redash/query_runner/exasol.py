import json
from datetime import datetime, date

from redash.query_runner import *

TYPES_MAP = {
    0: TYPE_BOOLEAN,    # BOOLEAN
    10: TYPE_INTEGER,   # DECIMAL(<19,0),INTEGER
    20: TYPE_FLOAT,     # DECIMAL(x,>0),DOUBLE
    30: TYPE_STRING,    # DECIMAL(>18,0),VARCHAR
    40: TYPE_DATETIME,  # TIMESTAMP
    41: TYPE_DATE,      # DATE
}

try:
    from turbodbc import connect, make_options, Megabytes

    enabled = True
except ImportError:
    enabled = False


class Exasol(BaseQueryRunner):
    noop_query = "SELECT 1 FROM DUAL"

    def test_connection(self):
        data, error = self.run_query(self.noop_query, None)
        if error is not None:
            raise Exception(error)

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "user": {
                    "type": "string"
                },
                "password": {
                    "type": "string"
                },
                "host": {
                    "type": "string",
                    "default": "127.0.0.1"
                },
                "port": {
                    "type": "number",
                    "default": 8563
                },
            },
            "order": ['host', 'port', 'user', 'password'],
            "secret": ["password"]
        }

    def _get_connection(self):
        options = make_options(read_buffer_size=Megabytes(100),
                               parameter_sets_to_buffer=1000,
                               varchar_max_character_limit=10000,
                               use_async_io=True,
                               prefer_unicode=True,
                               autocommit=True,
                               large_decimals_as_64_bit_types=True,
                               limit_varchar_results_to_max=True)

        exahost = "%s:%s" % (self.configuration['host'], self.configuration['port'])
        return connect(driver="Exasol driver",
                       exahost=exahost,
                       exauid=self.configuration['user'],
                       exapwd=self.configuration['password'],
                       turbodbc_options=options)

        return

    def run_query(self, query, user):
        connection = self._get_connection()
        cursor = connection.cursor()

        try:
            cursor.execute(query)

            columns = self.fetch_columns([(i[0], TYPES_MAP.get(i[1], None)) for i in cursor.description])
            cnames = [d[0] for d in cursor.description]
            rows = [dict(zip(cnames, row)) for row in cursor]

            data = {'columns': columns, 'rows': rows}
            error = None
            json_data = json.dumps(data, default=self._serializer)
        finally:
            cursor.close()
            connection.close()
        return json_data, error

    @staticmethod
    def _serializer(obj):
        if isinstance(obj, date):
            return obj.isoformat()
        elif isinstance(obj, datetime):
            return obj.isoformat()
        raise TypeError("Type %s not serializable" % type(obj))

    def get_schema(self, get_stats=False):
        query = """
        SELECT
            COLUMN_SCHEMA,
            COLUMN_TABLE,
            COLUMN_NAME
        FROM EXA_ALL_COLUMNS;
        """

        connection = self._get_connection()
        cursor = connection.cursor()

        try:
            cursor.execute(query)

            schema = {}

            for row in cursor:
                table_name = '{}.{}'.format(row[0], row[1])

                if table_name not in schema:
                    schema[table_name] = {'name': table_name, 'columns': []}

                schema[table_name]['columns'].append(row[2])
        finally:
            cursor.close()
            connection.close()

        return schema.values()

    @classmethod
    def enabled(cls):
        return enabled


register(Exasol)
