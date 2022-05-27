import logging
import sys
import uuid
from enum import Enum

from redash.query_runner import *
from redash.utils import json_dumps, json_loads

logger = logging.getLogger(__name__)

class IgniteServerType(Enum):
    NONE = 0
    IGNITE = 1
    GRIDGAIN = 3

try:
    from pygridgain import Client

    enabled = IgniteServerType.GRIDGAIN
except ImportError:
    try:
        import pyignite

        enabled = IgniteServerType.IGNITE
    except ImportError:
        enabled = IgniteServerType.NONE

types_map = {
    1: TYPE_STRING,
    2: TYPE_STRING,
    # Type #3 supposed to be an integer, but in some cases decimals are returned
    # with this type. To be on safe side, marking it as float.
    3: TYPE_FLOAT,
    4: TYPE_DATETIME,
    5: TYPE_FLOAT,
}


class Ignite(BaseSQLQueryRunner):
    should_annotate_query = False
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "user": {"type": "string"},
                "password": {"type": "string"},
                "server": {"type": "string", "default": "127.0.0.1"},
                "port": {"type": "number", "default": 10800},
#                 "tls" :
                "schema": {"type": "string", "title": "Schema Name", "default":"PUBLIC"},
                "gridgain": { "type":"boolean", "title": "Use GridGain libraries", "default": False },
            },
            "required": ["server"],
            "secret": ["password"],
        }

    @classmethod
    def enabled(cls):
      try:
        from pygridgain import Client
        return True
      except ImportError:
        try:
          import pyignite
          return True
        except ImportError:
          return False

    @classmethod
    def name(cls):
       return "Apache Ignite"

    @classmethod
    def type(cls):
        return "ignite"

    def _get_tables(self, schema):
        query = """
        SELECT schema_name, table_name, column_name
        FROM SYS.TABLE_COLUMNS
        WHERE schema_name NOT IN ('SYS') and column_name not in ('_KEY','_VAL');
        """

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json_loads(results)

        for row in results["rows"]:
            if row["SCHEMA_NAME"] != self.configuration.get("schema", "PUBLIC"):
                table_name = "{}.{}".format(row["SCHEMA_NAME"], row["TABLE_NAME"])
            else:
                table_name = row["TABLE_NAME"]

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

            schema[table_name]["columns"].append(row["COLUMN_NAME"])

        return list(schema.values())

    def run_query(self, query, user):
        connection = None

        try:
            server = self.configuration.get("server", "127.0.0.1")
            user = self.configuration.get("user", "")
            password = self.configuration.get("password", "")
            port = self.configuration.get("port", 10800)
            schema = self.configuration.get("schema", "PUBLIC")

            connection = Client()
            connection.connect(server, port)

            cursor = connection.sql(query, include_field_names=True)
            logger.debug("Ignite running query: %s", query)

            column_names = next(cursor)
            columns = [{ 'name':col, 'friendly_name':col.lower() } for col in column_names]
            rows = [ dict(zip(column_names, row)) for row in cursor ]
            json_data = json_dumps({ "columns" : columns, "rows": rows })
            error = None

        except (KeyboardInterrupt, JobTimeoutException):
            connection.cancel()
            raise
        finally:
            if connection:
                connection.close()

        return json_data, error


register(Ignite)
