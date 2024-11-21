import datetime
import logging
import os

from redash import __version__, statsd_client
from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseSQLQueryRunner,
    NotSupported,
    register,
    split_sql_statements,
)
from redash.settings import cast_int_or_default

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

ROW_LIMIT = cast_int_or_default(os.environ.get("DATABRICKS_ROW_LIMIT"), 20000)

logger = logging.getLogger(__name__)


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

            statements = split_sql_statements(query)
            for stmt in statements:
                cursor.execute(stmt)

            if cursor.description is not None:
                result_set = cursor.fetchmany(ROW_LIMIT)
                columns = self.fetch_columns([(i[0], TYPES_MAP.get(i[1], TYPE_STRING)) for i in cursor.description])

                rows = [dict(zip((column["name"] for column in columns), row)) for row in result_set]

                data = {"columns": columns, "rows": rows}

                if len(result_set) >= ROW_LIMIT and cursor.fetchone() is not None:
                    logger.warning("Truncated result set.")
                    statsd_client.incr("redash.query_runner.databricks.truncated")
                    data["truncated"] = True
                error = None
            else:
                error = None
                data = {
                    "columns": [{"name": "result", "type": TYPE_STRING}],
                    "rows": [{"result": "No data was returned."}],
                }

            cursor.close()
        except pyodbc.Error as e:
            if len(e.args) > 1:
                error = str(e.args[1])
            else:
                error = str(e)
            data = None

        return data, error

    def get_schema(self):
        raise NotSupported()

    def get_databases(self):
        query = "SHOW DATABASES"
        results, error = self.run_query(query, None)

        if error is not None:
            self._handle_run_query_error(error)

        first_column_name = results["columns"][0]["name"]
        return [row[first_column_name] for row in results["rows"]]

    def get_database_tables(self, database_name):
        schema = {}
        cursor = self._get_cursor()

        cursor.tables(schema=database_name)

        for table in cursor:
            table_name = "{}.{}".format(table[1], table[2])

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

        return list(schema.values())

    def get_database_tables_with_columns(self, database_name):
        schema = {}
        cursor = self._get_cursor()

        # load tables first, otherwise tables without columns are not showed
        cursor.tables(schema=database_name)

        for table in cursor:
            table_name = "{}.{}".format(table[1], table[2])

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

        cursor.columns(schema=database_name)

        for column in cursor:
            table_name = "{}.{}".format(column[1], column[2])

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

            schema[table_name]["columns"].append({"name": column[3], "type": column[5]})

        return list(schema.values())

    def get_table_columns(self, database_name, table_name):
        cursor = self._get_cursor()
        cursor.columns(schema=database_name, table=table_name)
        return [{"name": column[3], "type": column[5]} for column in cursor]


register(Databricks)
