import datetime
import logging

import yaml
from funcy import compact

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseHTTPQueryRunner,
    register,
)
from redash.utils import json_dumps


class QueryParseError(Exception):
    pass


def parse_query(query):
    # TODO: copy paste from Metrica query runner, we should extract this into a utility
    query = query.strip()
    if query == "":
        raise QueryParseError("Query is empty.")
    try:
        params = yaml.safe_load(query)
        return params
    except ValueError as e:
        logging.exception(e)
        error = str(e)
        raise QueryParseError(error)


TYPES_MAP = {
    str: TYPE_STRING,
    bytes: TYPE_STRING,
    int: TYPE_INTEGER,
    float: TYPE_FLOAT,
    bool: TYPE_BOOLEAN,
    datetime.datetime: TYPE_DATETIME,
}


def _get_column_by_name(columns, column_name):
    for c in columns:
        if "name" in c and c["name"] == column_name:
            return c

    return None


def _get_type(value):
    return TYPES_MAP.get(type(value), TYPE_STRING)


def add_column(columns, column_name, column_type):
    if _get_column_by_name(columns, column_name) is None:
        columns.append({"name": column_name, "friendly_name": column_name, "type": column_type})


def _apply_path_search(response, path):
    if path is None:
        return response

    path_parts = path.split(".")
    path_parts.reverse()
    while len(path_parts) > 0:
        current_path = path_parts.pop()
        if current_path in response:
            response = response[current_path]
        else:
            raise Exception("Couldn't find path {} in response.".format(path))

    return response


def _normalize_json(data, path):
    data = _apply_path_search(data, path)

    if isinstance(data, dict):
        # Check if the values are lists; if so, we need to unwrap them
        first_key = next(iter(data))
        if isinstance(data[first_key], list):
            new_data = []
            for key in data:
                for index, item in enumerate(data[key]):
                    if index >= len(new_data):
                        new_data.append({})
                    new_data[index][key] = item
            data = new_data
        else:
            data = [data]

    return data


def _sort_columns_with_fields(columns, fields):
    if fields:
        columns = compact([_get_column_by_name(columns, field) for field in fields])

    return columns


# TODO: merge the logic here with the one in MongoDB's queyr runner
def parse_json(data, path, fields):
    data = _normalize_json(data, path)

    rows = []
    columns = []

    for row in data:
        parsed_row = {}

        for key in row:
            if isinstance(row[key], dict):
                for inner_key in row[key]:
                    column_name = "{}.{}".format(key, inner_key)
                    if fields and key not in fields and column_name not in fields:
                        continue

                    value = row[key][inner_key]
                    add_column(columns, column_name, _get_type(value))
                    parsed_row[column_name] = value
            else:
                if fields and key not in fields:
                    continue

                value = row[key]
                add_column(columns, key, _get_type(value))
                parsed_row[key] = row[key]

        rows.append(parsed_row)

    columns = _sort_columns_with_fields(columns, fields)

    return {"rows": rows, "columns": columns}


class GraphQL(BaseHTTPQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {},
        }

    @classmethod
    def type(cls):
        return "graphql"

    def __init__(self, configuration):
        super(GraphQL, self).__init__(configuration)
        self.syntax = "yaml"

    def run_query(self, query, user):
        query_params = parse_query(query)

        if not isinstance(query_params, dict):
            return None, "Query should be a YAML object describing the URL to query."

        if "url" not in query_params:
            return None, "Query must include 'url' option."

        if "query" not in query_params:
            return None, "Query must include 'query' option."

        url = query_params.get("url")
        graphql_query = query_params.get("query")
        result_key = query_params.get("result_key")

        request_options = {
            "headers": {"Content-Type": "application/json"},
            "json": {"query": graphql_query},
        }

        response, error = self.get_response(url, http_method="post", **request_options)

        if error is not None:
            return None, error

        if response.status_code != 200:
            return None, "Failed to execute query. Return status code: {}.".format(response.status_code)

        response_data = response.json()
        if "errors" in response_data:
            return None, "Errors in query execution: {}".format(response_data["errors"])

        data = response_data.get("data", {})
        if result_key:
            data = data.get(result_key, [])

        # Use parse_json function to format the data properly
        formatted_data = parse_json(data, None, None)

        if formatted_data:
            json_data = json_dumps(formatted_data)
            return json_data, None
        else:
            return None, "Got empty response from '{}'.".format(url)


register(GraphQL)
