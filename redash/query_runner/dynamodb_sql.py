import logging
import sys

from redash.query_runner import *
from redash.utils import json_dumps

logger = logging.getLogger(__name__)

try:
    from dql import Engine, FragmentEngine
    from dynamo3 import DynamoDBError
    from pyparsing import ParseException

    enabled = True
except ImportError as e:
    enabled = False

types_map = {
    "UNICODE": TYPE_INTEGER,
    "TINYINT": TYPE_INTEGER,
    "SMALLINT": TYPE_INTEGER,
    "INT": TYPE_INTEGER,
    "DOUBLE": TYPE_FLOAT,
    "DECIMAL": TYPE_FLOAT,
    "FLOAT": TYPE_FLOAT,
    "REAL": TYPE_FLOAT,
    "BOOLEAN": TYPE_BOOLEAN,
    "TIMESTAMP": TYPE_DATETIME,
    "DATE": TYPE_DATETIME,
    "CHAR": TYPE_STRING,
    "STRING": TYPE_STRING,
    "VARCHAR": TYPE_STRING,
}


class DynamoDBSQL(BaseSQLQueryRunner):
    should_annotate_query = False

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "region": {"type": "string", "default": "us-east-1"},
                "access_key": {"type": "string"},
                "secret_key": {"type": "string"},
            },
            "required": ["access_key", "secret_key"],
            "secret": ["secret_key"],
        }

    def test_connection(self):
        engine = self._connect()
        list(engine.connection.list_tables())

    @classmethod
    def type(cls):
        return "dynamodb_sql"

    @classmethod
    def name(cls):
        return "DynamoDB (with DQL)"

    def _connect(self):
        engine = FragmentEngine()
        config = self.configuration.to_dict()

        if not config.get("region"):
            config["region"] = "us-east-1"

        if config.get("host") == "":
            config["host"] = None

        engine.connect(**config)

        return engine

    def _get_tables(self, schema):
        engine = self._connect()

        # We can't use describe_all because sometimes a user might give List permission
        # for * (all tables), but describe permission only for some of them.
        tables = engine.connection.list_tables()
        for table_name in tables:
            try:
                table = engine.describe(table_name, True)
                schema[table.name] = {
                    "name": table.name,
                    "columns": list(table.attrs.keys()),
                }
            except DynamoDBError:
                pass

    def run_query(self, query, user):
        engine = None
        try:
            engine = self._connect()

            if not query.endswith(";"):
                query = query + ";"

            result = engine.execute(query)

            columns = []
            rows = []

            # When running a count query it returns the value as a string, in which case
            # we transform it into a dictionary to be the same as regular queries.
            if isinstance(result, str):
                # when count < scanned_count, dql returns a string with number of rows scanned
                value = result.split(" (")[0]
                if value:
                    value = int(value)
                result = [{"value": value}]

            for item in result:
                if not columns:
                    for k, v in item.items():
                        columns.append(
                            {
                                "name": k,
                                "friendly_name": k,
                                "type": types_map.get(str(type(v)).upper(), None),
                            }
                        )
                rows.append(item)

            data = {"columns": columns, "rows": rows}
            json_data = json_dumps(data)
            error = None
        except ParseException as e:
            error = "Error parsing query at line {} (column {}):\n{}".format(
                e.lineno, e.column, e.line
            )
            json_data = None
        except (SyntaxError, RuntimeError) as e:
            error = str(e)
            json_data = None
        except KeyboardInterrupt:
            if engine and engine.connection:
                engine.connection.cancel()
            error = "Query cancelled by user."
            json_data = None

        return json_data, error


register(DynamoDBSQL)
