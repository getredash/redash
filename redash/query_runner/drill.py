import logging
import os
import re

from dateutil import parser

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    BaseHTTPQueryRunner,
    guess_type,
    register,
)

logger = logging.getLogger(__name__)


# Convert Drill string value to actual type
def convert_type(string_value, actual_type):
    if string_value is None or string_value == "":
        return ""

    if actual_type == TYPE_INTEGER:
        return int(string_value)

    if actual_type == TYPE_FLOAT:
        return float(string_value)

    if actual_type == TYPE_BOOLEAN:
        return str(string_value).lower() == "true"

    if actual_type == TYPE_DATETIME:
        return parser.parse(string_value)

    return str(string_value)


# Parse Drill API response and translate it to accepted format
def parse_response(data):
    cols = data["columns"]
    rows = data["rows"]

    if len(cols) == 0:
        return {"columns": [], "rows": []}

    first_row = rows[0]
    columns = []
    types = {}

    for c in cols:
        columns.append({"name": c, "type": guess_type(first_row[c]), "friendly_name": c})

    for col in columns:
        types[col["name"]] = col["type"]

    for row in rows:
        for key, value in row.items():
            row[key] = convert_type(value, types[key])

    return {"columns": columns, "rows": rows}


class Drill(BaseHTTPQueryRunner):
    noop_query = "select version from sys.version"
    response_error = "Drill API returned unexpected status code"
    requires_authentication = False
    requires_url = True
    url_title = "Drill URL"
    username_title = "Username"
    password_title = "Password"

    @classmethod
    def name(cls):
        return "Apache Drill"

    @classmethod
    def configuration_schema(cls):
        schema = super(Drill, cls).configuration_schema()
        # Since Drill itself can act as aggregator of various datasources,
        # it can contain quite a lot of schemas in `INFORMATION_SCHEMA`
        # We added this to improve user experience and let users focus only on desired schemas.
        schema["properties"]["allowed_schemas"] = {
            "type": "string",
            "title": "List of schemas to use in schema browser (comma separated)",
        }
        schema["order"] += ["allowed_schemas"]
        return schema

    def run_query(self, query, user):
        drill_url = os.path.join(self.configuration["url"], "query.json")

        payload = {"queryType": "SQL", "query": query}

        response, error = self.get_response(drill_url, http_method="post", json=payload)
        if error is not None:
            return None, error

        return parse_response(response.json()), None

    def get_schema(self, get_stats=False):
        query = """
        SELECT DISTINCT
            TABLE_SCHEMA,
            TABLE_NAME,
            COLUMN_NAME
        FROM
            INFORMATION_SCHEMA.`COLUMNS`
        WHERE
                TABLE_SCHEMA not in ('INFORMATION_SCHEMA', 'information_schema', 'sys')
            and TABLE_SCHEMA not like '%.information_schema'
            and TABLE_SCHEMA not like '%.INFORMATION_SCHEMA'

        """
        allowed_schemas = self.configuration.get("allowed_schemas")
        if allowed_schemas:
            query += "and TABLE_SCHEMA in ({})".format(
                ", ".join(
                    [
                        "'{}'".format(re.sub("[^a-zA-Z0-9_.`]", "", allowed_schema))
                        for allowed_schema in allowed_schemas.split(",")
                    ]
                )
            )

        results, error = self.run_query(query, None)

        if error is not None:
            self._handle_run_query_error(error)

        schema = {}

        for row in results["rows"]:
            table_name = "{}.{}".format(row["TABLE_SCHEMA"], row["TABLE_NAME"])

            if table_name not in schema:
                schema[table_name] = {"name": table_name, "columns": []}

            schema[table_name]["columns"].append(row["COLUMN_NAME"])

        return list(schema.values())


register(Drill)
