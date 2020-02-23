import base64
from .hive_ds import Hive
from redash.query_runner import register, BaseSQLQueryRunner
from redash.utils import json_dumps
from redash import __version__

try:
    import pyodbc

    enabled = True
except ImportError:
    enabled = False


class Databricks(BaseSQLQueryRunner):
    noop_query = "SELECT 1"

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
                # We're using `http_password` here for password for legacy reasons
                "http_password": {"type": "string", "title": "Access Token"},
                "schemas": {"type": "string", "title": "Schemas to Load Metadata For"},
            },
            "order": ["host", "http_path", "http_password"],
            "secret": ["http_password"],
            "required": ["host", "http_path", "http_password"],
        }

    def _get_cursor(self):
        connection_string = "Driver=Simba;HOST={};UID=token;PORT=443;PWD={};HTTPPath={};SSL=1;THRIFTTRANSPORT=2;SPARKSERVERTYPE=3;AUTHMECH=3;UserAgentEntry=Redash/{}"
        connection_string = connection_string.format(
            self.configuration["host"],
            self.configuration["http_password"],
            self.configuration["http_path"],
            __version__,
        )

        connection = pyodbc.connect(connection_string, autocommit=True)
        return connection.cursor()

    def run_query(self, query, user):
        try:
            cursor = self._get_cursor()

            cursor.execute(query)
            data = cursor.fetchall()

            if cursor.description is not None:
                columns = self.fetch_columns(
                    # [(i[0], types_map.get(i[1], None)) for i in cursor.description]
                    [(i[0], None) for i in cursor.description]
                )
                rows = [
                    dict(zip((column["name"] for column in columns), row))
                    for row in data
                ]

                data = {"columns": columns, "rows": rows}
                json_data = json_dumps(data)
                error = None
            else:
                error = "No data was returned."
                json_data = None

            cursor.close()
        except pyodbc.Error as e:
            try:
                # Query errors are at `args[1]`
                error = e.args[1]
            except IndexError:
                # Connection errors are `args[0][1]`
                error = e.args[0][1]

            json_data = None

        return json_data, error

    def _get_tables(self, schema):
        cursor = self._get_cursor()

        schemas = self.configuration.get("schemas", "").split(",")

        for schema_name in schemas:
            cursor.columns(schema=schema_name)

            for column in cursor:
                table_name = "{}.{}".format(column[1], column[2])

                if table_name not in schema:
                    schema[table_name] = {"name": table_name, "columns": []}

                schema[table_name]["columns"].append(column[3])

        return list(schema.values())


register(Databricks)
