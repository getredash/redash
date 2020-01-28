from io import StringIO
import logging
import sys
import uuid
import csv

from redash.query_runner import *
from redash.utils import json_dumps, json_loads

logger = logging.getLogger(__name__)

try:
    import atsd_client
    from atsd_client.exceptions import SQLException
    from atsd_client.services import SQLService, MetricsService

    enabled = True
except ImportError:
    enabled = False

types_map = {
    "long": TYPE_INTEGER,
    "bigint": TYPE_INTEGER,
    "integer": TYPE_INTEGER,
    "smallint": TYPE_INTEGER,
    "float": TYPE_FLOAT,
    "double": TYPE_FLOAT,
    "decimal": TYPE_FLOAT,
    "string": TYPE_STRING,
    "date": TYPE_DATE,
    "xsd:dateTimeStamp": TYPE_DATETIME,
}


def resolve_redash_type(type_in_atsd):
    """
    Retrieve corresponding redash type
    :param type_in_atsd: `str`
    :return: redash type constant
    """
    if isinstance(type_in_atsd, dict):
        type_in_redash = types_map.get(type_in_atsd["base"])
    else:
        type_in_redash = types_map.get(type_in_atsd)
    return type_in_redash


def generate_rows_and_columns(csv_response):
    """
    Prepare rows and columns in redash format from ATSD csv response
    :param csv_response: `str`
    :return: prepared rows and columns
    """
    meta, data = csv_response.split("\n", 1)
    meta = meta[1:]

    meta_with_padding = meta + "=" * (4 - len(meta) % 4)
    meta_decoded = meta_with_padding.decode("base64")
    meta_json = json_loads(meta_decoded)
    meta_columns = meta_json["tableSchema"]["columns"]

    reader = csv.reader(data.splitlines())
    next(reader)

    columns = [
        {
            "friendly_name": i["titles"],
            "type": resolve_redash_type(i["datatype"]),
            "name": i["name"],
        }
        for i in meta_columns
    ]
    column_names = [c["name"] for c in columns]
    rows = [dict(zip(column_names, row)) for row in reader]
    return columns, rows


class AxibaseTSD(BaseQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def name(cls):
        return "Axibase Time Series Database"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "protocol": {"type": "string", "title": "Protocol", "default": "http"},
                "hostname": {
                    "type": "string",
                    "title": "Host",
                    "default": "axibase_tsd_hostname",
                },
                "port": {"type": "number", "title": "Port", "default": 8088},
                "username": {"type": "string"},
                "password": {"type": "string", "title": "Password"},
                "timeout": {
                    "type": "number",
                    "default": 600,
                    "title": "Connection Timeout",
                },
                "min_insert_date": {
                    "type": "string",
                    "title": "Metric Minimum Insert Date",
                },
                "expression": {"type": "string", "title": "Metric Filter"},
                "limit": {"type": "number", "default": 5000, "title": "Metric Limit"},
                "trust_certificate": {
                    "type": "boolean",
                    "title": "Trust SSL Certificate",
                },
            },
            "required": ["username", "password", "hostname", "protocol", "port"],
            "secret": ["password"],
        }

    def __init__(self, configuration):
        super(AxibaseTSD, self).__init__(configuration)
        self.url = "{0}://{1}:{2}".format(
            self.configuration.get("protocol", "http"),
            self.configuration.get("hostname", "localhost"),
            self.configuration.get("port", 8088),
        )

    def run_query(self, query, user):
        connection = atsd_client.connect_url(
            self.url,
            self.configuration.get("username"),
            self.configuration.get("password"),
            verify=self.configuration.get("trust_certificate", False),
            timeout=self.configuration.get("timeout", 600),
        )
        sql = SQLService(connection)
        query_id = str(uuid.uuid4())

        try:
            logger.debug("SQL running query: %s", query)
            data = sql.query_with_params(
                query,
                {"outputFormat": "csv", "metadataFormat": "EMBED", "queryId": query_id},
            )

            columns, rows = generate_rows_and_columns(data)

            data = {"columns": columns, "rows": rows}
            json_data = json_dumps(data)
            error = None

        except SQLException as e:
            json_data = None
            error = e.content
        except (KeyboardInterrupt, InterruptException):
            sql.cancel_query(query_id)
            error = "Query cancelled by user."
            json_data = None

        return json_data, error

    def get_schema(self, get_stats=False):
        connection = atsd_client.connect_url(
            self.url,
            self.configuration.get("username"),
            self.configuration.get("password"),
            verify=self.configuration.get("trust_certificate", False),
            timeout=self.configuration.get("timeout", 600),
        )
        metrics = MetricsService(connection)
        ml = metrics.list(
            expression=self.configuration.get("expression", None),
            minInsertDate=self.configuration.get("min_insert_date", None),
            limit=self.configuration.get("limit", 5000),
        )
        metrics_list = [i.name.encode("utf-8") for i in ml]
        metrics_list.append("atsd_series")
        schema = {}
        default_columns = [
            "entity",
            "datetime",
            "time",
            "metric",
            "value",
            "text",
            "tags",
            "entity.tags",
            "metric.tags",
        ]
        for table_name in metrics_list:
            schema[table_name] = {
                "name": "'{}'".format(table_name),
                "columns": default_columns,
            }
        values = list(schema.values())
        return values


register(AxibaseTSD)
