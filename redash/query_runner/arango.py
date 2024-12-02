import logging

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_FLOAT,
    TYPE_STRING,
    BaseQueryRunner,
    register,
)

logger = logging.getLogger(__name__)

try:
    from arango import ArangoClient

    enabled = True
except ImportError:
    enabled = False


_TYPE_MAPPINGS = {
    "boolean": TYPE_BOOLEAN,
    "number": TYPE_FLOAT,
    "string": TYPE_STRING,
    "array": TYPE_STRING,
    "object": TYPE_STRING,
}


class Arango(BaseQueryRunner):
    noop_query = "RETURN {'id': 1}"

    @classmethod
    def name(cls):
        return "ArangoDB"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "user": {"type": "string"},
                "password": {"type": "string"},
                "host": {"type": "string", "default": "127.0.0.1"},
                "port": {"type": "number", "default": 8529},
                "dbname": {"type": "string", "title": "Database Name"},
                "timeout": {"type": "number", "default": 0.0, "title": "AQL Timeout in seconds (0 = no timeout)"},
            },
            "order": ["host", "port", "user", "password", "dbname"],
            "required": ["host", "user", "password", "dbname"],
            "secret": ["password"],
        }

    @classmethod
    def enabled(cls):
        try:
            import arango  # noqa: F401
        except ImportError:
            return False

        return True

    @classmethod
    def type(cls):
        return "arangodb"

    def run_query(self, query, user):
        client = ArangoClient(hosts="{}:{}".format(self.configuration["host"], self.configuration.get("port", 8529)))
        db = client.db(
            self.configuration["dbname"], username=self.configuration["user"], password=self.configuration["password"]
        )

        try:
            cursor = db.aql.execute(query, max_runtime=self.configuration.get("timeout", 0.0))
            result = [i for i in cursor]
            column_tuples = [(i, TYPE_STRING) for i in result[0].keys()]
            columns = self.fetch_columns(column_tuples)
            data = {
                "columns": columns,
                "rows": result,
            }

            error = None
        except Exception:
            raise

        return data, error


register(Arango)
