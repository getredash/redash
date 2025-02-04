import logging
import sqlite3

from redash.query_runner import (
    BaseSQLQueryRunner,
    JobTimeoutException,
    register,
)

logger = logging.getLogger(__name__)


class Sqlite(BaseSQLQueryRunner):
    noop_query = "pragma quick_check"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {"dbpath": {"type": "string", "title": "Database Path"}},
            "required": ["dbpath"],
        }

    @classmethod
    def type(cls):
        return "sqlite"

    def __init__(self, configuration):
        super(Sqlite, self).__init__(configuration)

        self._dbpath = self.configuration.get("dbpath", "")

    def _get_tables(self, schema):
        query_table = "select tbl_name from sqlite_master where type='table'"
        query_columns = 'PRAGMA table_info("%s")'

        results, error = self.run_query(query_table, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        for row in results["rows"]:
            table_name = row["tbl_name"]
            schema[table_name] = {"name": table_name, "columns": []}
            results_table, error = self.run_query(query_columns % (table_name,), None)
            if error is not None:
                self._handle_run_query_error(error)

            for row_column in results_table["rows"]:
                schema[table_name]["columns"].append(row_column["name"])

        return list(schema.values())

    def run_query(self, query, user):
        connection = sqlite3.connect(self._dbpath)

        cursor = connection.cursor()

        try:
            cursor.execute(query)

            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], None) for i in cursor.description])
                rows = [dict(zip((column["name"] for column in columns), row)) for row in cursor]

                data = {"columns": columns, "rows": rows}
                error = None
            else:
                error = "Query completed but it returned no data."
                data = None
        except (KeyboardInterrupt, JobTimeoutException):
            connection.cancel()
            raise
        finally:
            connection.close()
        return data, error


register(Sqlite)
