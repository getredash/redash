import logging
import yaml
import socket
import ipaddress
import datetime
from urllib.parse import urlparse
from funcy import compact, project
from six import text_type
from redash.utils import json_dumps
from redash.query_runner import (
    BaseHTTPQueryRunner,
    register,
    TYPE_BOOLEAN,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
)


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
        error = text_type(e)
        raise QueryParseError(error)


def is_private_address(url):
    hostname = urlparse(url).hostname
    ip_address = socket.gethostbyname(hostname)
    return ipaddress.ip_address(text_type(ip_address)).is_private


TYPES_MAP = {
    str: TYPE_STRING,
    text_type: TYPE_STRING,
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
        columns.append(
            {"name": column_name, "friendly_name": column_name, "type": column_type}
        )


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


class JSON(BaseHTTPQueryRunner):
    requires_url = False

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "username": {"type": "string", "title": cls.username_title},
                "password": {"type": "string", "title": cls.password_title},
            },
            "secret": ["password"],
            "order": ["username", "password"],
        }

    def __init__(self, configuration):
        super(JSON, self).__init__(configuration)
        self.syntax = "yaml"

    def test_connection(self):
        pass

    def run_query(self, query, user):
        try:
            query = parse_query(query)

            if not isinstance(query, dict):
                raise QueryParseError(
                    "Query should be a YAML object describing the URL to query."
                )

            if "url" not in query:
                raise QueryParseError("Query must include 'url' option.")

            if is_private_address(query["url"]):
                raise Exception("Can't query private addresses.")

            method = query.get("method", "get")
            request_options = project(
                query, ("params", "headers", "data", "auth", "json")
            )

            fields = query.get("fields")
            path = query.get("path")

            if isinstance(request_options.get("auth", None), list):
                request_options["auth"] = tuple(request_options["auth"])
            elif self.configuration.get("username") or self.configuration.get(
                "password"
            ):
                request_options["auth"] = (
                    self.configuration.get("username"),
                    self.configuration.get("password"),
                )

            if method not in ("get", "post"):
                raise QueryParseError("Only GET or POST methods are allowed.")

            if fields and not isinstance(fields, list):
                raise QueryParseError("'fields' needs to be a list.")

            response, error = self.get_response(
                query["url"], http_method=method, **request_options
            )

            if error is not None:
                return None, error

            data = json_dumps(parse_json(response.json(), path, fields))

            if data:
                return data, None
            else:
                return None, "Got empty response from '{}'.".format(query["url"])
        except KeyboardInterrupt:
            return None, "Query cancelled by user."


register(JSON)
