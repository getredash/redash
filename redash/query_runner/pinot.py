try:
    from pinotdb import connect
    from pinotdb.db import *

    enabled = True
except ImportError:
    enabled = False

logger = logging.getLogger(__name__)
try:
    import requests
    import httplib2
except ImportError as e:
    logger.error("Failed to import: " + str(e))

from redash.query_runner import BaseQueryRunner, register
from redash.query_runner import TYPE_STRING, TYPE_INTEGER, TYPE_BOOLEAN
from redash.utils import json_dumps, json_loads

TYPES_MAP = {1: "string", 2: "integer", 3: "boolean"}


class Pinot(BaseQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "controllerHost": {"type": "string", "default": "localhost"},
                "controllerPort": {"type": "number", "default": 9000},
                "brokerHost": {"type": "string", "default": "localhost"},
                "brokerPort": {"type": "number", "default": 8000},
                "scheme": {"type": "string", "default": "http"},
                "user": {"type": "string"},
                "password": {"type": "string"},
            },
            "order": ["scheme", "controllerHost", "controllerPort", "brokerHost", "brokerPort", "user", "password"],
            "required": ["controllerHost", "brokerHost"],
            "secret": ["password"],
        }

    @classmethod
    def name(cls):
        return "Apache Pinot"

    @classmethod
    def enabled(cls):
        return enabled
    
    def extract_field_names(self, field_specs):
        return [field["name"] for field in field_specs]

    def run_query(self, query, user):
        connection = connect(
            host=self.configuration["brokerHost"],
            port=self.configuration["brokerPort"],
            path="/query/sql",
            scheme=(self.configuration.get("scheme") or "http"),
            username=(self.configuration.get("user") or None),
            password=(self.configuration.get("password") or None)
        )

        cursor = connection.cursor()

        try:
            cursor.execute(query)
            columns = self.fetch_columns(
                [(i[0], TYPES_MAP.get(i[1].value, None)) for i in cursor.description]
            )
            rows = [
                dict(zip((column["name"] for column in columns), row)) for row in cursor
            ]

            data = {"columns": columns, "rows": rows}
            error = None
            json_data = json_dumps(data)
            print(json_data)
        finally:
            connection.close()

        return json_data, error

    def get_schema(self, get_stats=False):
        host=self.configuration["controllerHost"]
        port=self.configuration["controllerPort"]
        scheme=(self.configuration.get("scheme") or "http")

        tables_response = requests.get(f"{scheme}://{host}:{port}/tables")
        tables = tables_response.json()["tables"]

        schema = {}
        for table_name in tables:
            schema[table_name] = {"name": table_name, "columns": []}

            schema_response = requests.get(f"{scheme}://{host}:{port}/tables/{table_name}/schema")
            schema_json = schema_response.json()

            dimension_fields = self.extract_field_names(schema_json.get("dimensionFieldSpecs", []))
            date_time_fields = self.extract_field_names(schema_json.get("dateTimeFieldSpecs", []))
            metric_fields = self.extract_field_names(schema_json.get("metricFieldSpecs", []))

            schema[table_name]["columns"] = dimension_fields + date_time_fields + metric_fields

        return list(schema.values())


register(Pinot)
