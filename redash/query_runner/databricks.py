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
    from databricks import sql as databricks_sql

    enabled = True
except ImportError:
    enabled = False

# Maps the type names reported in `cursor.description` by the Databricks SQL
# connector to Redash types.
TYPES_MAP = {
    "string": TYPE_STRING,
    "char": TYPE_STRING,
    "varchar": TYPE_STRING,
    "boolean": TYPE_BOOLEAN,
    "date": TYPE_DATE,
    "timestamp": TYPE_DATETIME,
    "timestamp_ntz": TYPE_DATETIME,
    "tinyint": TYPE_INTEGER,
    "smallint": TYPE_INTEGER,
    "int": TYPE_INTEGER,
    "bigint": TYPE_INTEGER,
    "float": TYPE_FLOAT,
    "double": TYPE_FLOAT,
    "decimal": TYPE_FLOAT,
}

ROW_LIMIT = cast_int_or_default(os.environ.get("DATABRICKS_ROW_LIMIT"), 20000)

logger = logging.getLogger(__name__)


def _normalize_host(host):
    host = host.strip()
    for prefix in ("https://", "http://"):
        if host.lower().startswith(prefix):
            host = host[len(prefix) :]
    return host.rstrip("/")


def _table_name(row):
    return "{}.{}".format(row.TABLE_SCHEM, row.TABLE_NAME)


class Databricks(BaseSQLQueryRunner):
    noop_query = "SELECT 1"

    def __init__(self, configuration):
        super().__init__(configuration)
        self.should_annotate_query = configuration.get("useQueryAnnotation", False)

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
                "useQueryAnnotation": {
                    "type": "boolean",
                    "title": "Use Query Annotation",
                    "default": False,
                },
            },
            "order": ["host", "http_path", "http_password", "useQueryAnnotation"],
            "secret": ["http_password"],
            "required": ["host", "http_path", "http_password"],
        }

    def annotate_query(self, query, metadata):
        # Remove "Job ID" before annotating the query so repeated runs of the
        # same query produce identical statements and can hit the Databricks
        # SQL result cache.
        metadata = {k: v for k, v in metadata.items() if k != "Job ID"}
        return super().annotate_query(query, metadata)

    def _get_connection(self):
        user_agent = "Redash/{}".format(__version__.split("-")[0])
        return databricks_sql.connect(
            server_hostname=_normalize_host(self.configuration["host"]),
            http_path=self.configuration["http_path"],
            access_token=self.configuration["http_password"],
            user_agent_entry=user_agent,
            enable_telemetry=False,
        )

    def run_query(self, query, user):
        try:
            with self._get_connection() as connection:
                with connection.cursor() as cursor:
                    statements = split_sql_statements(query)
                    for stmt in statements:
                        cursor.execute(stmt)

                    if cursor.description is not None:
                        result_set = cursor.fetchmany(ROW_LIMIT)
                        columns = self.fetch_columns(
                            [(i[0], TYPES_MAP.get(i[1], TYPE_STRING)) for i in cursor.description]
                        )

                        rows = [dict(zip((column["name"] for column in columns), row)) for row in result_set]

                        data = {"columns": columns, "rows": rows}

                        if len(result_set) >= ROW_LIMIT and cursor.fetchone() is not None:
                            logger.warning("Truncated result set.")
                            statsd_client.incr("redash.query_runner.databricks.truncated")
                            data["truncated"] = True
                    else:
                        data = {
                            "columns": [{"name": "result", "type": TYPE_STRING}],
                            "rows": [{"result": "No data was returned."}],
                        }
            error = None
        except databricks_sql.Error as e:
            error = e.message or e.__class__.__name__
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
        with self._get_connection() as connection:
            with connection.cursor() as cursor:
                for table in cursor.tables(schema_name=database_name).fetchall():
                    table_name = _table_name(table)
                    schema.setdefault(table_name, {"name": table_name, "columns": []})

        return list(schema.values())

    def get_database_tables_with_columns(self, database_name):
        schema = {}
        with self._get_connection() as connection:
            with connection.cursor() as cursor:
                # load tables first, otherwise tables without columns are not showed
                for table in cursor.tables(schema_name=database_name).fetchall():
                    table_name = _table_name(table)
                    schema.setdefault(table_name, {"name": table_name, "columns": []})

                for column in cursor.columns(schema_name=database_name).fetchall():
                    table_name = _table_name(column)
                    schema.setdefault(table_name, {"name": table_name, "columns": []})
                    schema[table_name]["columns"].append({"name": column.COLUMN_NAME, "type": column.TYPE_NAME})

        return list(schema.values())

    def get_table_columns(self, database_name, table_name):
        with self._get_connection() as connection:
            with connection.cursor() as cursor:
                columns = cursor.columns(schema_name=database_name, table_name=table_name).fetchall()
                return [{"name": column.COLUMN_NAME, "type": column.TYPE_NAME} for column in columns]


register(Databricks)
