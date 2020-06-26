import datetime
from redash.query_runner import (
    register,
    BaseSQLQueryRunner,
    TYPE_STRING,
    TYPE_BOOLEAN,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_INTEGER,
    TYPE_FLOAT,
)
from redash.utils import json_dumps
from redash import __version__

try:
    import pyodbc

    enabled = True
except ImportError:
    enabled = False


TYPES_MAP = {
    str: TYPE_STRING,
    bool: TYPE_BOOLEAN,
    datetime.date: TYPE_DATE,
    datetime.datetime: TYPE_DATETIME,
    int: TYPE_INTEGER,
    float: TYPE_FLOAT,
}


def _build_odbc_connection_string(**kwargs):
    return ";".join([f"{k}={v}" for k, v in kwargs.items()])


class Databricks(BaseSQLQueryRunner):
    noop_query = "SELECT 1"
    should_annotate_query = False

    @classmethod
    def type(cls):
        return "databricks"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "host": {"type": "string"},
                "http_path": {"type": "string", "title": "HTTP Path"},
                # We're using `http_password` here for legacy reasons
                "http_password": {"type": "string", "title": "Access Token"},
                "schemas": {"type": "string", "title": "Schemas to Load Metadata For"},
            },
            "order": ["host", "http_path", "http_password"],
            "secret": ["http_password"],
            "required": ["host", "http_path", "http_password"],
        }

    def _get_cursor(self):
        user_agent = "Redash/{} (Databricks)".format(__version__.split("-")[0])
        connection_string = _build_odbc_connection_string(
            Driver="Simba",
            UID="token",
            PORT="443",
            SSL="1",
            THRIFTTRANSPORT="2",
            SPARKSERVERTYPE="3",
            AUTHMECH=3,
            # Use the query as is without rewriting:
            UseNativeQuery="1",
            # Automatically reconnect to the cluster if an error occurs
            AutoReconnect="1",
            # Minimum interval between consecutive polls for query execution status (1ms)
            AsyncExecPollInterval="1",
            UserAgentEntry=user_agent,
            HOST=self.configuration["host"],
            PWD=self.configuration["http_password"],
            HTTPPath=self.configuration["http_path"],
        )

        connection = pyodbc.connect(connection_string, autocommit=True)
        return connection.cursor()

    def run_query(self, query, user):
        try:
            cursor = self._get_cursor()

            cursor.execute(query)

            if cursor.description is not None:
                data = cursor.fetchall()
                columns = self.fetch_columns(
                    [
                        (i[0], TYPES_MAP.get(i[1], TYPE_STRING))
                        for i in cursor.description
                    ]
                )

                rows = [
                    dict(zip((column["name"] for column in columns), row))
                    for row in data
                ]

                data = {"columns": columns, "rows": rows}
                json_data = json_dumps(data)
                error = None
            else:
                error = None
                json_data = json_dumps(
                    {
                        "columns": [{"name": "result", "type": TYPE_STRING}],
                        "rows": [{"result": "No data was returned."}],
                    }
                )

            cursor.close()
        except pyodbc.Error as e:
            if len(e.args) > 1:
                error = str(e.args[1])
            else:
                error = str(e)
            json_data = None

        return json_data, error

    def _get_tables(self, schema):
        cursor = self._get_cursor()

        schemas = self.configuration.get(
            "schemas", self.configuration.get("database", "")
        ).split(",")

        for schema_name in schemas:
            cursor.columns(schema=schema_name)

            for column in cursor:
                table_name = "{}.{}".format(column[1], column[2])

                if table_name not in schema:
                    schema[table_name] = {"name": table_name, "columns": []}

                schema[table_name]["columns"].append(column[3])

        return list(schema.values())


register(Databricks)
