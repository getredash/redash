import logging

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseSQLQueryRunner,
    register,
)

logger = logging.getLogger(__name__)

types_map = {
    5: TYPE_BOOLEAN,
    6: TYPE_INTEGER,
    7: TYPE_FLOAT,
    8: TYPE_STRING,
    9: TYPE_STRING,
    10: TYPE_DATE,
    11: TYPE_DATETIME,
    12: TYPE_DATETIME,
    13: TYPE_DATETIME,
    14: TYPE_DATETIME,
    15: TYPE_DATETIME,
    16: TYPE_FLOAT,
    17: TYPE_STRING,
    114: TYPE_DATETIME,
    115: TYPE_STRING,
    116: TYPE_STRING,
    117: TYPE_STRING,
}


class Vertica(BaseSQLQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "host": {"type": "string"},
                "user": {"type": "string"},
                "password": {"type": "string", "title": "Password"},
                "database": {"type": "string", "title": "Database name"},
                "port": {"type": "number"},
                "read_timeout": {"type": "number", "title": "Read Timeout"},
                "connection_timeout": {"type": "number", "title": "Connection Timeout"},
            },
            "required": ["database"],
            "order": [
                "host",
                "port",
                "user",
                "password",
                "database",
                "read_timeout",
                "connection_timeout",
            ],
            "secret": ["password"],
        }

    @classmethod
    def enabled(cls):
        try:
            import vertica_python  # noqa: F401
        except ImportError:
            return False

        return True

    def _get_tables(self, schema):
        query = """
        Select table_schema, table_name, column_name from columns where is_system_table=false
        union all
        select table_schema, table_name, column_name from view_columns;
        """

        results, error = self.run_query(query, None)

        if error is not None:
            self._handle_run_query_error(error)

        for row in results["rows"]:
            table_name = "{}.{}".format(row["table_schema"], row["table_name"])

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

            schema[table_name]["columns"].append(row["column_name"])

        return list(schema.values())

    def run_query(self, query, user):
        import vertica_python

        if query == "":
            data = None
            error = "Query is empty"
            return data, error

        connection = None
        try:
            conn_info = {
                "host": self.configuration.get("host", ""),
                "port": self.configuration.get("port", 5433),
                "user": self.configuration.get("user", ""),
                "password": self.configuration.get("password", ""),
                "database": self.configuration.get("database", ""),
                "read_timeout": self.configuration.get("read_timeout", 600),
            }

            if self.configuration.get("connection_timeout"):
                conn_info["connection_timeout"] = self.configuration.get("connection_timeout")

            connection = vertica_python.connect(**conn_info)
            cursor = connection.cursor()
            logger.debug("Vertica running query: %s", query)
            cursor.execute(query)

            if cursor.description is not None:
                columns_data = [(i[0], types_map.get(i[1], None)) for i in cursor.description]

                columns = self.fetch_columns(columns_data)
                rows = [dict(zip(([c["name"] for c in columns]), r)) for r in cursor.fetchall()]

                data = {"columns": columns, "rows": rows}
                error = None
            else:
                data = None
                error = "No data was returned."

            cursor.close()
        finally:
            if connection:
                connection.close()

        return data, error


register(Vertica)
