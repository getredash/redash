try:
    import snowflake.connector

    enabled = True
except ImportError:
    enabled = False


from redash.query_runner import BaseQueryRunner, register
from redash.query_runner import (
    TYPE_STRING,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_INTEGER,
    TYPE_FLOAT,
    TYPE_BOOLEAN,
)
from redash.utils import json_dumps, json_loads

TYPES_MAP = {
    0: TYPE_INTEGER,
    1: TYPE_FLOAT,
    2: TYPE_STRING,
    3: TYPE_DATE,
    4: TYPE_DATETIME,
    5: TYPE_STRING,
    6: TYPE_DATETIME,
    7: TYPE_DATETIME,
    8: TYPE_DATETIME,
    13: TYPE_BOOLEAN,
}


class Snowflake(BaseQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "account": {"type": "string"},
                "user": {"type": "string"},
                "password": {"type": "string"},
                "warehouse": {"type": "string"},
                "database": {"type": "string"},
                "region": {"type": "string", "default": "us-west"},
            },
            "order": ["account", "user", "password", "warehouse", "database", "region"],
            "required": ["user", "password", "account", "database", "warehouse"],
            "secret": ["password"],
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

    def _get_connection(self):
        region = self.configuration.get("region")

        # for us-west we don't need to pass a region (and if we do, it fails to connect)
        if region == "us-west":
            region = None

        connection = snowflake.connector.connect(
            user=self.configuration["user"],
            password=self.configuration["password"],
            account=self.configuration["account"],
            region=region,
        )

        return connection

    def _parse_results(self, cursor):
        columns = self.fetch_columns(
            [(i[0], self.determine_type(i[1], i[5])) for i in cursor.description]
        )
        rows = [
            dict(zip((column["name"] for column in columns), row)) for row in cursor
        ]

        data = {"columns": columns, "rows": rows}
        return data

    def run_query(self, query, user):
        connection = self._get_connection()
        cursor = connection.cursor()

        try:
            cursor.execute("USE WAREHOUSE {}".format(self.configuration["warehouse"]))
            cursor.execute("USE {}".format(self.configuration["database"]))

            cursor.execute(query)

            data = self._parse_results(cursor)
            error = None
            json_data = json_dumps(data)
        finally:
            cursor.close()
            connection.close()

        return json_data, error

    def _run_query_without_warehouse(self, query):
        connection = self._get_connection()
        cursor = connection.cursor()

        try:
            cursor.execute("USE {}".format(self.configuration["database"]))

            cursor.execute(query)

            data = self._parse_results(cursor)
            error = None
        finally:
            cursor.close()
            connection.close()

        return data, error

    def get_schema(self, get_stats=False):
        query = """
        SHOW COLUMNS IN DATABASE {database}
        """.format(
            database=self.configuration["database"]
        )

        results, error = self._run_query_without_warehouse(query)

        if error is not None:
            raise Exception("Failed getting schema.")

        schema = {}
        for row in results["rows"]:
            if row["kind"] == "COLUMN":
                table_name = "{}.{}".format(row["schema_name"], row["table_name"])

                if table_name not in schema:
                    schema[table_name] = {"name": table_name, "columns": []}

                schema[table_name]["columns"].append(row["column_name"])

        return list(schema.values())


register(Snowflake)
