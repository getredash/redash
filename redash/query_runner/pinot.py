import logging
import requests

from redash.query_runner import *
from redash.utils import json_dumps, json_loads

try:
    from pinotdb import connect

    enabled = True
except ImportError:
    enabled = False

logger = logging.getLogger(__name__)


PINOT_TYPES_MAPPING = {
    "INT": TYPE_INTEGER,
    "LONG": TYPE_INTEGER,
    "FLOAT": TYPE_FLOAT,
    "DOUBLE": TYPE_FLOAT,
    "STRING": TYPE_STRING,
    "BYTES": TYPE_STRING,
}

DEFAULT_BROKER_PORT = 8000
DEFAULT_CONTROLLER_PORT = 9000


class Pinot(BaseSQLQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "controller_host": {
                    "type": "string",
                    "title": "Controller service host",
                },
                "controller_port": {
                    "type": "number",
                    "default": DEFAULT_CONTROLLER_PORT,
                    "title": "Controller service port",
                },
                "broker_host": {"type": "string", "title": "Broker host"},
                "broker_port": {
                    "type": "number",
                    "default": DEFAULT_BROKER_PORT,
                    "title": "Broker port",
                },
                "use_ssl": {"type": "boolean", "default": False, "title": "Use SSL"},
            },
            "order": [
                "controller_host",
                "controller_port",
                "broker_host",
                "broker_port",
            ],
            "required": ["controller_host", "broker_host"],
        }

    @classmethod
    def type(cls):
        return "pinot"

    def __init__(self, configuration):
        super(Pinot, self).__init__(configuration)

        self._controller = f"{self.configuration['controller_host']}:{self.configuration.get('controller_port', DEFAULT_CONTROLLER_PORT)}"
        self._proto = "https" if self.configuration["use_ssl"] == True else "http"

    def _get_table_schema(self, schema, table_name):
        url = f"{self._proto}://{self._controller}/schemas/{table_name}"
        r = requests.get(url)

        if r.status_code != 200:
            raise Exception(f"Failed getting schema for table {table_name}.")

        result = r.json()

        for column in result.get("dimensionFieldSpecs", []) + result.get(
            "metricFieldSpecs", []
        ):
            c = {
                "name": column["name"],
                "type": PINOT_TYPES_MAPPING[column["dataType"]],
            }
            schema[table_name]["columns"].append(c)

    def _get_tables(self, schema):
        url = f"{self._proto}://{self._controller}/tables"
        r = requests.get(url)

        if r.status_code != 200:
            raise Exception("Failed getting tables.")

        for table_name in r.json()["tables"]:
            logger.debug(f"Discovered table {table_name}")
            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}
            self._get_table_schema(schema, table_name)

        return list(schema.values())

    def run_query(self, query, user):
        _broker = self.configuration["broker_host"]
        _port = self.configuration.get("broker_port", DEFAULT_BROKER_PORT)

        connection = connect(
            host=_broker, port=_port, path="/query/sql", scheme=self._proto
        )
        cursor = connection.cursor()

        try:
            json_data = None
            cursor.execute(query)

            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], None) for i in cursor.description])
                rows = [
                    dict(zip((column["name"] for column in columns), row))
                    for row in cursor
                ]

                data = {"columns": columns, "rows": rows}
                error = None
                json_data = json_dumps(data)
            else:
                error = "Query completed but it returned no data."
                json_data = None
        except (KeyboardInterrupt, JobTimeoutException):
            connection.close()
            raise
        finally:
            connection.close()
        return json_data, error


register(Pinot)
