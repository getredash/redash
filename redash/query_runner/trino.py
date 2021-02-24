from collections import defaultdict
from redash.query_runner import *
from redash.utils import json_dumps, json_loads

import logging

logger = logging.getLogger(__name__)


try:
    import trino

    enabled = True

except ImportError:
    enabled = False

TRINO_TYPES_MAPPING = {
    "integer": TYPE_INTEGER,
    "tinyint": TYPE_INTEGER,
    "smallint": TYPE_INTEGER,
    "long": TYPE_INTEGER,
    "bigint": TYPE_INTEGER,
    "float": TYPE_FLOAT,
    "double": TYPE_FLOAT,
    "boolean": TYPE_BOOLEAN,
    "string": TYPE_STRING,
    "varchar": TYPE_STRING,
    "date": TYPE_DATE,
}


def extract_columns_from_type_string(name, type_string):
    name_prefix = name + "." if name else ""
    if type_string.startswith("row"):
        columns = []
        braces_level = 0
        in_literal = False
        type_start_index = 0
        name_start_index = 0
        for i, c in enumerate(type_string):
            if c == "`":
                in_literal = not in_literal
            if not in_literal:
                if c == "(":
                    braces_level += 1
                    if braces_level == 1:
                        name_start_index = i + 1
                elif c == ")":
                    braces_level -= 1
                    if braces_level == 0:
                        columns.extend(
                            extract_columns_from_type_string(
                                name_prefix
                                + type_string[
                                    name_start_index : type_start_index - 1
                                ].strip(),
                                type_string[type_start_index:i],
                            )
                        )
                if braces_level == 1:
                    if c == " ":
                        type_start_index = i + 1
                    elif c == ",":
                        columns.extend(
                            extract_columns_from_type_string(
                                name_prefix
                                + type_string[
                                    name_start_index : type_start_index - 1
                                ].strip(),
                                type_string[type_start_index:i],
                            )
                        )
                        name_start_index = i + 1
        return columns
    elif type_string.startswith("array"):
        return extract_columns_from_type_string(
            name, type_string[type_string.find("(") + 1 : type_string.rfind(")")]
        )
    else:
        return [{"name": name, "type": type_string}]


class Trino(BaseQueryRunner):
    noop_query = "SHOW TABLES"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "host": {"type": "string"},
                "protocol": {"type": "string", "default": "http"},
                "port": {"type": "number"},
                "schema": {"type": "string"},
                "catalog": {"type": "string"},
                "username": {"type": "string"},
                "password": {"type": "string"},
            },
            "order": [
                "host",
                "protocol",
                "port",
                "username",
                "password",
                "schema",
                "catalog",
            ],
            "required": ["host"],
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def type(cls):
        return "trino"

    def get_schema(self, get_stats=False):
        schema = {}
        results, error = self.run_query("SHOW SCHEMAS", None)
        if error is not None:
            raise Exception("Failed getting schema.")
        for schema_row in json_loads(results)["rows"]:
            if schema_row["Schema"] in ["pg_catalog", "information_schema"]:
                continue
            query_tables = 'SHOW TABLES FROM "{}"'.format(schema_row["Schema"])
            results, error = self.run_query(query_tables, None)
            if error is not None:
                raise Exception(
                    "Failed getting schema. Failed executing {}".format(query_tables)
                )
            for table_row in json_loads(results)["rows"]:
                table_name = "{}.{}".format(schema_row["Schema"], table_row["Table"])
                schema[table_name] = {"name": table_name, "columns": []}

                query_columns = 'SHOW COLUMNS FROM "{}"."{}"'.format(
                    schema_row["Schema"], table_row["Table"]
                )
                results, error = self.run_query(query_columns, None)
                if error is not None:
                    schema.pop(table_name)
                    logger.warning(
                        "Failed getting columns for table {}, so skipping it. (probably it's an hive view :)".format(
                            table_name
                        )
                    )
                else:
                    for column_row in json_loads(results)["rows"]:
                        schema[table_name]["columns"].extend(
                            c["name"]
                            for c in extract_columns_from_type_string(
                                column_row["Column"], column_row["Type"]
                            )
                        )

        return list(schema.values())

    def run_query(self, query, user):
        password = self.configuration.get("password") or None
        user = self.configuration.get("username", "redash")
        connection = trino.dbapi.connect(
            host=self.configuration.get("host", ""),
            port=self.configuration.get("port", 8080),
            user=user,
            catalog=self.configuration.get("catalog", "hive"),
            schema=self.configuration.get("schema", "default"),
            http_scheme=self.configuration.get("protocol", "http"),
            auth=trino.auth.BasicAuthentication(user, password) if password else None,
        )

        cursor = connection.cursor()

        json_data = None
        error = None
        try:
            cursor.execute(query)
            query_result = cursor.fetchall()
            column_tuples = [
                (i[0], TRINO_TYPES_MAPPING.get(i[1], None)) for i in cursor.description
            ]
            columns = self.fetch_columns(column_tuples)
            rows = [
                dict(zip(([column["name"] for column in columns]), r))
                for i, r in enumerate(query_result)
            ]
            data = {"columns": columns, "rows": rows}
            json_data = json_dumps(data)
        except (KeyboardInterrupt, InterruptException, JobTimeoutException):
            cursor.cancel()
            raise
        except Exception as e:
            error = "Unspecified Error while execute [{}]: {}".format(query, str(e))

        return json_data, error


register(Trino)
