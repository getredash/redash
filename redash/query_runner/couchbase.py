import datetime
import logging

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseQueryRunner,
    register,
)

logger = logging.getLogger(__name__)
try:
    import httplib2  # noqa: F401
    import requests
except ImportError as e:
    logger.error("Failed to import: " + str(e))


TYPES_MAP = {
    str: TYPE_STRING,
    bytes: TYPE_STRING,
    int: TYPE_INTEGER,
    float: TYPE_FLOAT,
    bool: TYPE_BOOLEAN,
    datetime.datetime: TYPE_DATETIME,
    datetime.datetime: TYPE_STRING,
}


def _get_column_by_name(columns, column_name):
    for c in columns:
        if "name" in c and c["name"] == column_name:
            return c
    return None


def parse_results(results):
    rows = []
    columns = []

    for row in results:
        parsed_row = {}
        for key in row:
            if isinstance(row[key], dict):
                for inner_key in row[key]:
                    column_name = "{}.{}".format(key, inner_key)
                    if _get_column_by_name(columns, column_name) is None:
                        columns.append(
                            {
                                "name": column_name,
                                "friendly_name": column_name,
                                "type": TYPES_MAP.get(type(row[key][inner_key]), TYPE_STRING),
                            }
                        )

                    parsed_row[column_name] = row[key][inner_key]

            else:
                if _get_column_by_name(columns, key) is None:
                    columns.append(
                        {
                            "name": key,
                            "friendly_name": key,
                            "type": TYPES_MAP.get(type(row[key]), TYPE_STRING),
                        }
                    )

                parsed_row[key] = row[key]

        rows.append(parsed_row)
    return rows, columns


class Couchbase(BaseQueryRunner):
    should_annotate_query = False
    noop_query = "Select 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "protocol": {"type": "string", "default": "http"},
                "host": {"type": "string"},
                "port": {
                    "type": "string",
                    "title": "Port (Defaults: 8095 - Analytics, 8093 - N1QL)",
                    "default": "8095",
                },
                "user": {"type": "string"},
                "password": {"type": "string"},
            },
            "required": ["host", "user", "password"],
            "order": ["protocol", "host", "port", "user", "password"],
            "secret": ["password"],
        }

    def __init__(self, configuration):
        super(Couchbase, self).__init__(configuration)

    @classmethod
    def enabled(cls):
        return True

    def test_connection(self):
        self.call_service(self.noop_query, "")

    def get_buckets(self, query, name_param):
        defaultColumns = ["meta().id"]
        result = self.call_service(query, "").json()["results"]
        schema = {}
        for row in result:
            table_name = row.get(name_param)
            schema[table_name] = {"name": table_name, "columns": defaultColumns}

        return list(schema.values())

    def get_schema(self, get_stats=False):
        try:
            # Try fetch from Analytics
            return self.get_buckets(
                "SELECT ds.GroupName as name FROM Metadata.`Dataset` ds where ds.DataverseName <> 'Metadata'",
                "name",
            )
        except Exception:
            # Try fetch from N1QL
            return self.get_buckets("select name from system:keyspaces", "name")

    def call_service(self, query, user):
        try:
            user = self.configuration.get("user")
            password = self.configuration.get("password")
            protocol = self.configuration.get("protocol", "http")
            host = self.configuration.get("host")
            port = self.configuration.get("port", 8095)
            params = {"statement": query}

            url = "%s://%s:%s/query/service" % (protocol, host, port)

            r = requests.post(url, params=params, auth=(user, password))
            r.raise_for_status()
            return r
        except requests.exceptions.HTTPError as err:
            if err.response.status_code == 401:
                raise Exception("Wrong username/password")
            raise Exception("Couchbase connection error")

    def run_query(self, query, user):
        result = self.call_service(query, user)

        rows, columns = parse_results(result.json()["results"])
        data = {"columns": columns, "rows": rows}

        return data, None

    @classmethod
    def name(cls):
        return "Couchbase"


register(Couchbase)
