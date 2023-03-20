try:
    import snowflake.connector
    import os
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives.asymmetric import rsa
    from cryptography.hazmat.primitives.asymmetric import dsa
    from cryptography.hazmat.primitives import serialization
    import logging

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
                "schema": {"type": "string"},
                "role": {"type": "string"},
                "region": {"type": "string", "default": "us-west"},
                "host": {"type": "string"},
                "private_key_file_name": {"type": "string",
                                "title": "Private Key file name"
                                },
                "use_private_key": {
                    "type": "boolean",
                    "title": "Use Private Key Combina (see compose file for path)",
                    "default": True,
                },
                "lower_case_columns": {
                    "type": "boolean",
                    "title": "Lower Case Column Names in Results",
                    "default": False,
                },
            },
            "order": [
                "account",
                "user",
                "password",
                "warehouse",
                "database",
                "schema",
                "role",
                "region",
                "host",
            ],
            "required": ["user", "account", "database", "warehouse"],
            "secret": ["password"],
            "extra_options": [
                "host",
            ],
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

    def _get_private_key_as_bytes(self):
        private_key_file_name = self.configuration.get("private_key_file_name")
        if not private_key_file_name:
            raise Exception("Private key file name is required when using private key.")

        with open("/app/private_keys/{}".format(private_key_file_name), "rb") as key:
            p_key = serialization.load_pem_private_key(
                key.read(),
                None,
                backend=default_backend()
            )

        pkb = p_key.private_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption())
        return pkb

    def _get_connection(self):
        region = self.configuration.get("region")
        account = self.configuration["account"]

        # for us-west we don't need to pass a region (and if we do, it fails to connect)
        if region == "us-west":
            region = None

        if self.configuration.__contains__("host"):
            host = self.configuration.get("host")
        else:
            if region:
                host = "{}.{}.snowflakecomputing.com".format(account, region)
            else:
                host = "{}.snowflakecomputing.com".format(account)

        # Private key mounted to volume and user selected to use private key checkbox.
        # See docker-compose.yml server volume.
        connection_args = {
            "user": self.configuration["user"],
            "account": account,
            "region": region,
            "host": host,
            "warehouse": self.configuration.get("warehouse"),
            "database": self.configuration.get("database"),
        }

        if self.configuration.get("schema"):
            connection_args["schema"] = self.configuration.get("schema")
        if self.configuration.get("role"):
            connection_args["role"] = self.configuration.get("role")

        if self.configuration.get("use_private_key"):
            logging.info("Initializing connection with private key")
            connection_args["private_key"] = self._get_private_key_as_bytes()

        else:
            logging.info("Initializing connection with username and password :(")
            if not self.configuration["password"]:
                raise Exception("Password is required when not using private key.")

            connection_args["password"] = self.configuration["password"]

        connection = snowflake.connector.connect(**connection_args)

        return connection

    def _column_name(self, column_name):
        if self.configuration.get("lower_case_columns", False):
            return column_name.lower()

        return column_name

    def _parse_results(self, cursor):
        columns = self.fetch_columns(
            [
                (self._column_name(i[0]), self.determine_type(i[1], i[5]))
                for i in cursor.description
            ]
        )
        rows = [
            dict(zip((column["name"] for column in columns), row)) for row in cursor
        ]

        data = {"columns": columns, "rows": rows}
        return data

    def run_query(self, query, user):
        connection = self._get_connection()

        try:

            cursor_list = connection.execute_string("USE WAREHOUSE {}; USE {}; {}".format(
                self.configuration["warehouse"], self.configuration["database"], query))
            last_cursor = cursor_list[-1]

            data = self._parse_results(last_cursor)
            error = None
            json_data = json_dumps(data)
        finally:
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

    def _database_name_includes_schema(self):
        return "." in self.configuration.get("database")

    def get_schema(self, get_stats=False):
        if self._database_name_includes_schema():
            query = "SHOW COLUMNS"
        else:
            query = "SHOW COLUMNS IN DATABASE"

        results, error = self._run_query_without_warehouse(query)

        if error is not None:
            self._handle_run_query_error(error)

        schema = {}
        for row in results["rows"]:
            if row["kind"] == "COLUMN":
                table_name = "{}.{}".format(row["schema_name"], row["table_name"])

                if table_name not in schema:
                    schema[table_name] = {"name": table_name, "columns": []}

                schema[table_name]["columns"].append(row["column_name"])

        return list(schema.values())


register(Snowflake)
