try:
    import pinotdb

    enabled = True
except ImportError:
    enabled = False

import logging

import requests
from requests.auth import HTTPBasicAuth

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

PINOT_TYPES_MAPPING = {
    "BOOLEAN": TYPE_BOOLEAN,
    "INT": TYPE_INTEGER,
    "LONG": TYPE_INTEGER,
    "FLOAT": TYPE_FLOAT,
    "DOUBLE": TYPE_FLOAT,
    "STRING": TYPE_STRING,
    "BYTES": TYPE_STRING,
    "JSON": TYPE_STRING,
    "TIMESTAMP": TYPE_DATETIME,
}


class Pinot(BaseQueryRunner):
    noop_query = "SELECT 1"
    username = None
    password = None

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "brokerHost": {"type": "string", "default": ""},
                "brokerPort": {"type": "number", "default": 8099},
                "brokerScheme": {"type": "string", "default": "http"},
                "controllerURI": {"type": "string", "default": ""},
                "username": {"type": "string"},
                "password": {"type": "string"},
            },
            "order": ["brokerScheme", "brokerHost", "brokerPort", "controllerURI", "username", "password"],
            "required": ["brokerHost", "controllerURI"],
            "secret": ["password"],
        }

    @classmethod
    def enabled(cls):
        return enabled

    def __init__(self, configuration):
        super(Pinot, self).__init__(configuration)
        self.controller_uri = self.configuration.get("controllerURI")
        self.username = self.configuration.get("username") or None
        self.password = self.configuration.get("password") or None

    def run_query(self, query, user):
        logger.debug("Running query %s with username: %s", query, self.username)
        connection = pinotdb.connect(
            host=self.configuration["brokerHost"],
            port=self.configuration["brokerPort"],
            path="/query/sql",
            scheme=(self.configuration.get("brokerScheme") or "http"),
            verify_ssl=False,
            username=self.username,
            password=self.password,
        )

        cursor = connection.cursor()

        try:
            cursor.execute(query)
            logger.debug("cursor.schema = %s", cursor.schema)
            columns = self.fetch_columns(
                [(i["name"], PINOT_TYPES_MAPPING.get(i["type"], None)) for i in cursor.schema]
            )
            rows = [dict(zip((column["name"] for column in columns), row)) for row in cursor]

            data = {"columns": columns, "rows": rows}
            error = None
            logger.debug("Pinot execute query [%s]", query)
        finally:
            connection.close()

        return data, error

    def get_schema(self, get_stats=False):
        schema = {}
        for schema_name in self.get_schema_names():
            for table_name in self.get_table_names():
                schema_table_name = "{}.{}".format(schema_name, table_name)
                if table_name not in schema:
                    schema[schema_table_name] = {"name": schema_table_name, "columns": []}
                table_schema = self.get_pinot_table_schema(table_name)

                for column in (
                    table_schema.get("dimensionFieldSpecs", [])
                    + table_schema.get("metricFieldSpecs", [])
                    + table_schema.get("dateTimeFieldSpecs", [])
                ):
                    c = {
                        "name": column["name"],
                        "type": PINOT_TYPES_MAPPING[column["dataType"]],
                    }
                    schema[schema_table_name]["columns"].append(c)
        return list(schema.values())

    def get_schema_names(self):
        return ["default"]

    def get_pinot_table_schema(self, pinot_table_name):
        return self.get_metadata_from_controller("/tables/" + pinot_table_name + "/schema")

    def get_table_names(self):
        return self.get_metadata_from_controller("/tables")["tables"]

    def get_metadata_from_controller(self, path):
        url = self.controller_uri + path
        r = requests.get(url, headers={"Accept": "application/json"}, auth=HTTPBasicAuth(self.username, self.password))
        try:
            result = r.json()
            logger.debug("get_metadata_from_controller from path %s", path)
        except ValueError as e:
            raise pinotdb.exceptions.DatabaseError(
                f"Got invalid json response from {self.controller_uri}:{path}: {r.text}"
            ) from e
        return result


register(Pinot)
