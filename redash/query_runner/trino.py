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

logger = logging.getLogger(__name__)

try:
    import trino
    from trino.exceptions import DatabaseError

    enabled = True
except ImportError:
    enabled = False

TRINO_TYPES_MAPPING = {
    "boolean": TYPE_BOOLEAN,
    "tinyint": TYPE_INTEGER,
    "smallint": TYPE_INTEGER,
    "integer": TYPE_INTEGER,
    "long": TYPE_INTEGER,
    "bigint": TYPE_INTEGER,
    "float": TYPE_FLOAT,
    "real": TYPE_FLOAT,
    "double": TYPE_FLOAT,
    "decimal": TYPE_INTEGER,
    "varchar": TYPE_STRING,
    "char": TYPE_STRING,
    "string": TYPE_STRING,
    "json": TYPE_STRING,
    "date": TYPE_DATE,
    "timestamp": TYPE_DATETIME,
}


class Trino(BaseQueryRunner):
    noop_query = "SELECT 1"
    should_annotate_query = False

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "protocol": {"type": "string", "default": "http"},
                "host": {"type": "string"},
                "port": {"type": "number"},
                "username": {"type": "string"},
                "password": {"type": "string"},
                "catalog": {"type": "string"},
                "schema": {"type": "string"},
            },
            "order": [
                "protocol",
                "host",
                "port",
                "username",
                "password",
                "catalog",
                "schema",
            ],
            "required": ["host", "username"],
            "secret": ["password"],
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def type(cls):
        return "trino"

    def get_schema(self, get_stats=False):
        if self.configuration.get("catalog"):
            catalogs = [self.configuration.get("catalog")]
        else:
            catalogs = self._get_catalogs()

        schema = {}
        for catalog in catalogs:
            query = f"""
                SELECT table_schema, table_name, column_name, data_type
                FROM {catalog}.information_schema.columns
                WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
            """
            results, error = self.run_query(query, None)

            if error is not None:
                self._handle_run_query_error(error)

            for row in results["rows"]:
                table_name = f'{catalog}.{row["table_schema"]}.{row["table_name"]}'

                if table_name not in schema:
                    schema[table_name] = {"name": table_name, "columns": []}

                column = {"name": row["column_name"], "type": row["data_type"]}
                schema[table_name]["columns"].append(column)

        return list(schema.values())

    def _get_catalogs(self):
        query = """
            SHOW CATALOGS
        """
        results, error = self.run_query(query, None)

        if error is not None:
            self._handle_run_query_error(error)

        catalogs = []
        for row in results["rows"]:
            catalog = row["Catalog"]
            if "." in catalog:
                catalog = f'"{catalog}"'
            catalogs.append(catalog)
        return catalogs

    def run_query(self, query, user):
        if self.configuration.get("password"):
            auth = trino.auth.BasicAuthentication(
                username=self.configuration.get("username"), password=self.configuration.get("password")
            )
        else:
            auth = trino.constants.DEFAULT_AUTH
        connection = trino.dbapi.connect(
            http_scheme=self.configuration.get("protocol", "http"),
            host=self.configuration.get("host", ""),
            port=self.configuration.get("port", 8080),
            catalog=self.configuration.get("catalog", ""),
            schema=self.configuration.get("schema", ""),
            user=self.configuration.get("username"),
            auth=auth,
        )

        cursor = connection.cursor()

        try:
            cursor.execute(query)
            results = cursor.fetchall()
            description = cursor.description
            columns = self.fetch_columns([(c[0], TRINO_TYPES_MAPPING.get(c[1], None)) for c in description])
            rows = [dict(zip([c["name"] for c in columns], r)) for r in results]
            data = {"columns": columns, "rows": rows}
            error = None
        except DatabaseError as db:
            data = None
            default_message = "Unspecified DatabaseError: {0}".format(str(db))
            if isinstance(db.args[0], dict):
                message = db.args[0].get("failureInfo", {"message", None}).get("message")
            else:
                message = None
            error = default_message if message is None else message
        except (KeyboardInterrupt, InterruptException, JobTimeoutException):
            cursor.cancel()
            raise

        return data, error


register(Trino)
