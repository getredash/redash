import logging

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseQueryRunner,
    InterruptException,
    JobTimeoutException,
    register,
)

try:
    from e6data_python_connector import Connection
    from sqlalchemy.exc import DatabaseError

    enabled = True

except ImportError:
    enabled = False

from redash.utils import json_dumps

logger = logging.getLogger(__name__)

E6DATA_TYPES_MAPPING = {
    "INT": TYPE_INTEGER,
    "BYTE": TYPE_INTEGER,
    "INTEGER": TYPE_INTEGER,
    "LONG": TYPE_INTEGER,
    "SHORT": TYPE_INTEGER,
    "FLOAT": TYPE_INTEGER,
    "DOUBLE": TYPE_INTEGER,
    "STRING": TYPE_STRING,
    "DATETIME": TYPE_DATETIME,
    "BINARY": TYPE_INTEGER,
    "ARRAY": TYPE_STRING,
    "MAP": TYPE_STRING,
    "STRUCT": TYPE_STRING,
    "UNION_TYPE": TYPE_STRING,
    "DECIMAL_TYPE": TYPE_FLOAT,
    "DATE": TYPE_DATE,
    "INT96": TYPE_INTEGER,
    "BOOLEAN": TYPE_BOOLEAN,
    "CHAR": TYPE_STRING,
}


class e6data(BaseQueryRunner):
    limit_query = " LIMIT 1000"

    should_annotate_query = False

    def __init__(self, configuration):
        super().__init__(configuration)
        self.connection = Connection(
            host=self.configuration.get("host"),
            port=self.configuration.get("port"),
            username=self.configuration.get("username"),
            database=self.configuration.get("database"),
            password=self.configuration.get("password"),
        )

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "host": {"type": "string"},
                "port": {"type": "number"},
                "username": {"type": "string"},
                "password": {"type": "string"},
                "catalog": {"type": "string"},
                "database": {"type": "string"},
            },
            "order": [
                "host",
                "port",
                "username",
                "password",
                "catalog",
                "database",
            ],
            "required": ["host", "username", "password", "catalog", "database"],
            "secret": ["password"],
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def type(cls):
        return "e6data"

    def run_query(self, query, user):
        cursor = self.connection.cursor(catalog_name=self.configuration.get("catalog"))
        try:
            cursor.execute(query)
            results = cursor.fetchall()
            description = cursor.description
            columns = self.fetch_columns([(c[0], E6DATA_TYPES_MAPPING.get(c[1], None)) for c in description])
            rows = [dict(zip([c["name"] for c in columns], r)) for r in results]
            data = {"columns": columns, "rows": rows}
            json_data = json_dumps(data)
            error = None
        except DatabaseError as db:
            json_data = None
            default_message = "Unspecified DatabaseError: {0}".format(str(db))
            if isinstance(db.args[0], dict):
                message = db.args[0].get("failureInfo", {"message", None}).get("message")
            else:
                message = None
            error = default_message if message is None else message
        except (KeyboardInterrupt, InterruptException, JobTimeoutException) as intExp:
            error = intExp
            json_data = None
            cursor.cancel()
        except Exception:
            error = "Invalid Configuration"
            json_data = None
        return json_data, error

    def test_connection(self):
        self.noop_query = "SELECT 1"

        data, error = self.run_query(self.noop_query, None)

        if error is not None:
            raise Exception(error)

    def get_schema(self, get_stats=False):
        tables = self.connection.get_tables(self.configuration.get("catalog"), self.configuration.get("database"))

        schema = list()

        for table_name in tables:
            columns = self.connection.get_columns(
                self.configuration.get("catalog"),
                self.configuration.get("database"),
                table_name,
            )
            columns_with_type = []

            for column in columns:
                columns_with_type.append({"name": column["fieldName"], "type": column["fieldType"]})

            table_schema = {"name": table_name, "columns": columns_with_type}

            schema.append(table_schema)

        return schema


register(e6data)
