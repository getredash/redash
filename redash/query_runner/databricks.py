import base64
from .hive_ds import Hive
from redash.query_runner import register

try:
    from pyhive import hive
    from thrift.transport import THttpClient

    enabled = True
except ImportError:
    enabled = False


class Databricks(Hive):
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
                "database": {"type": "string"},
                "http_path": {"type": "string", "title": "HTTP Path"},
                "http_password": {"type": "string", "title": "Access Token"},
            },
            "order": ["host", "http_path", "http_password", "database"],
            "secret": ["http_password"],
            "required": ["host", "database", "http_path", "http_password"],
        }

    def _get_connection(self):
        host = self.configuration["host"]

        # if path is set but is missing initial slash, append it
        path = self.configuration.get("http_path", "")
        if path and path[0] != "/":
            path = "/" + path

        http_uri = "https://{}{}".format(host, path)

        transport = THttpClient.THttpClient(http_uri)

        password = self.configuration.get("http_password", "")
        auth = base64.b64encode("token:" + password)
        transport.setCustomHeaders({"Authorization": "Basic " + auth})

        connection = hive.connect(thrift_transport=transport)
        return connection

    def _get_tables(self, schema):
        schemas_query = "show schemas"
        tables_query = "show tables in %s"
        columns_query = "show columns in %s.%s"

        schemas = self._run_query_internal(schemas_query)

        for schema_name in [
            a for a in [str(a["databaseName"]) for a in schemas] if len(a) > 0
        ]:
            for table_name in [
                a
                for a in [
                    str(a["tableName"])
                    for a in self._run_query_internal(tables_query % schema_name)
                ]
                if len(a) > 0
            ]:
                columns = [
                    a
                    for a in [
                        str(a["col_name"])
                        for a in self._run_query_internal(
                            columns_query % (schema_name, table_name)
                        )
                    ]
                    if len(a) > 0
                ]

                if schema_name != "default":
                    table_name = "{}.{}".format(schema_name, table_name)

                schema[table_name] = {"name": table_name, "columns": columns}
        return list(schema.values())


register(Databricks)
