try:
    import pymapd

    enabled = True
except ImportError:
    enabled = False

from redash.query_runner import BaseSQLQueryRunner, register
from redash.query_runner import (
    TYPE_STRING,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_INTEGER,
    TYPE_FLOAT,
    TYPE_BOOLEAN,
)
from redash.utils import json_dumps

TYPES_MAP = {
    0: TYPE_INTEGER,
    1: TYPE_INTEGER,
    2: TYPE_INTEGER,
    3: TYPE_FLOAT,
    4: TYPE_FLOAT,
    5: TYPE_FLOAT,
    6: TYPE_STRING,
    7: TYPE_DATE,
    8: TYPE_DATETIME,
    9: TYPE_DATE,
    10: TYPE_BOOLEAN,
    11: TYPE_DATE,
    12: TYPE_DATE,
}


class Mapd(BaseSQLQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "host": {"type": "string", "default": "localhost"},
                "port": {"type": "number", "default": 9091},
                "user": {"type": "string", "default": "mapd", "title": "username"},
                "password": {"type": "string", "default": "HyperInteractive"},
                "database": {"type": "string", "default": "mapd"},
            },
            "order": ["user", "password", "host", "port", "database"],
            "required": ["host", "port", "user", "password", "database"],
            "secret": ["password"],
        }

    @classmethod
    def enabled(cls):
        return enabled

    def connect_database(self):
        connection = pymapd.connect(
            user=self.configuration["user"],
            password=self.configuration["password"],
            host=self.configuration["host"],
            port=self.configuration["port"],
            dbname=self.configuration["database"],
        )
        return connection

    def run_query(self, query, user):
        connection = self.connect_database()
        cursor = connection.cursor()

        try:
            cursor.execute(query)
            columns = self.fetch_columns(
                [(i[0], TYPES_MAP.get(i[1], None)) for i in cursor.description]
            )
            rows = [
                dict(zip((column["name"] for column in columns), row)) for row in cursor
            ]
            data = {"columns": columns, "rows": rows}
            error = None
            json_data = json_dumps(data)
        finally:
            cursor.close()
            connection.close()

        return json_data, error

    def _get_tables(self, schema):
        connection = self.connect_database()
        try:
            for table_name in connection.get_tables():
                schema[table_name] = {"name": table_name, "columns": []}
                for row_column in connection.get_table_details(table_name):
                    schema[table_name]["columns"].append(row_column[0])
        finally:
            connection.close

        return list(schema.values())

    def test_connection(self):
        connection = self.connect_database()
        try:
            tables = connection.get_tables()
            num_tables = tables.count(tables)
        finally:
            connection.close


register(Mapd)
