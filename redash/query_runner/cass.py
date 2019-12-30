import logging

from redash.query_runner import BaseQueryRunner, register
from redash.utils import JSONEncoder, json_dumps, json_loads

logger = logging.getLogger(__name__)

try:
    from cassandra.cluster import Cluster
    from cassandra.auth import PlainTextAuthProvider
    from cassandra.util import sortedset

    enabled = True
except ImportError:
    enabled = False


class CassandraJSONEncoder(JSONEncoder):
    def default(self, o):
        if isinstance(o, sortedset):
            return list(o)
        return super(CassandraJSONEncoder, self).default(o)


class Cassandra(BaseQueryRunner):
    noop_query = "SELECT dateof(now()) FROM system.local"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "host": {"type": "string"},
                "port": {"type": "number", "default": 9042},
                "keyspace": {"type": "string", "title": "Keyspace name"},
                "username": {"type": "string", "title": "Username"},
                "password": {"type": "string", "title": "Password"},
                "protocol": {
                    "type": "number",
                    "title": "Protocol Version",
                    "default": 3,
                },
                "timeout": {"type": "number", "title": "Timeout", "default": 10},
            },
            "required": ["keyspace", "host"],
        }

    @classmethod
    def type(cls):
        return "Cassandra"

    def get_schema(self, get_stats=False):
        query = """
        select release_version from system.local;
        """
        results, error = self.run_query(query, None)
        results = json_loads(results)
        release_version = results["rows"][0]["release_version"]

        query = """
        SELECT table_name, column_name
        FROM system_schema.columns
        WHERE keyspace_name ='{}';
        """.format(
            self.configuration["keyspace"]
        )

        if release_version.startswith("2"):
            query = """
                SELECT columnfamily_name AS table_name, column_name
                FROM system.schema_columns
                WHERE keyspace_name ='{}';
                """.format(
                self.configuration["keyspace"]
            )

        results, error = self.run_query(query, None)
        results = json_loads(results)

        schema = {}
        for row in results["rows"]:
            table_name = row["table_name"]
            column_name = row["column_name"]
            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}
            schema[table_name]["columns"].append(column_name)

        return list(schema.values())

    def run_query(self, query, user):
        connection = None
        try:
            if self.configuration.get("username", "") and self.configuration.get(
                "password", ""
            ):
                auth_provider = PlainTextAuthProvider(
                    username="{}".format(self.configuration.get("username", "")),
                    password="{}".format(self.configuration.get("password", "")),
                )
                connection = Cluster(
                    [self.configuration.get("host", "")],
                    auth_provider=auth_provider,
                    port=self.configuration.get("port", ""),
                    protocol_version=self.configuration.get("protocol", 3),
                )
            else:
                connection = Cluster(
                    [self.configuration.get("host", "")],
                    port=self.configuration.get("port", ""),
                    protocol_version=self.configuration.get("protocol", 3),
                )
            session = connection.connect()
            session.set_keyspace(self.configuration["keyspace"])
            session.default_timeout = self.configuration.get("timeout", 10)
            logger.debug("Cassandra running query: %s", query)
            result = session.execute(query)

            column_names = result.column_names

            columns = self.fetch_columns([(c, "string") for c in column_names])

            rows = [dict(zip(column_names, row)) for row in result]

            data = {"columns": columns, "rows": rows}
            json_data = json_dumps(data, cls=CassandraJSONEncoder)

            error = None
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None

        return json_data, error


class ScyllaDB(Cassandra):
    @classmethod
    def type(cls):
        return "scylla"


register(Cassandra)
register(ScyllaDB)
