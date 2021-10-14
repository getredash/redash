try:
    from firebolt_db.firebolt_connector import Connection
    enabled = True
except ImportError:
    enabled = False

from redash.query_runner import BaseQueryRunner, register
from redash.query_runner import TYPE_STRING, TYPE_INTEGER, TYPE_BOOLEAN
from redash.utils import json_dumps, json_loads

TYPES_MAP = {1: TYPE_STRING, 2: TYPE_INTEGER, 3: TYPE_BOOLEAN}


class Firebolt(BaseQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "host": {"type": "string", "default": "localhost"},
                "port": {"type": "string", "default": 8123},
                "DB": {"type": "string"},
                "user": {"type": "string"},
                "password": {"type": "string"},
            },
            "order": ["host", "port", "user", "password", "DB"],
            "required": ["user","password"],
            "secret": ["password"],
        }

    @classmethod
    def enabled(cls):
        return enabled

    def run_query(self, query, user):
        connection = Connection(
            host=self.configuration["host"],
            port=self.configuration["port"],
            username=(self.configuration.get("user") or None),
            password=(self.configuration.get("password") or None),
            db_name=(self.configuration.get("DB") or None),
        )

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
            connection.close()

        return json_data, error


    def get_schema(self, get_stats=False):
        query = """
        SELECT TABLE_SCHEMA,
               TABLE_NAME,
               COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA <> 'INFORMATION_SCHEMA'
        """

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        schema = {}
        results = json_loads(results)

        for row in results["rows"]:
            table_name = "{}.{}".format(row["table_schema"], row["table_name"])

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

            schema[table_name]["columns"].append(row["column_name"])

        return list(schema.values())


register(Firebolt)
