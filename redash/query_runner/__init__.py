import logging

from dateutil import parser
import requests

from six import text_type

from redash import settings
from redash.utils import json_loads

logger = logging.getLogger(__name__)

__all__ = [
    "BaseQueryRunner",
    "BaseHTTPQueryRunner",
    "InterruptException",
    "BaseSQLQueryRunner",
    "TYPE_DATETIME",
    "TYPE_BOOLEAN",
    "TYPE_INTEGER",
    "TYPE_STRING",
    "TYPE_DATE",
    "TYPE_FLOAT",
    "SUPPORTED_COLUMN_TYPES",
    "register",
    "get_query_runner",
    "import_query_runners",
    "guess_type",
]

# Valid types of columns returned in results:
TYPE_INTEGER = "integer"
TYPE_FLOAT = "float"
TYPE_BOOLEAN = "boolean"
TYPE_STRING = "string"
TYPE_DATETIME = "datetime"
TYPE_DATE = "date"

SUPPORTED_COLUMN_TYPES = set(
    [TYPE_INTEGER, TYPE_FLOAT, TYPE_BOOLEAN, TYPE_STRING, TYPE_DATETIME, TYPE_DATE]
)


class InterruptException(Exception):
    pass


class NotSupported(Exception):
    pass


class BaseQueryRunner(object):
    deprecated = False
    should_annotate_query = True
    noop_query = None

    def __init__(self, configuration):
        self.syntax = "sql"
        self.configuration = configuration

    @classmethod
    def name(cls):
        return cls.__name__

    @classmethod
    def type(cls):
        return cls.__name__.lower()

    @classmethod
    def enabled(cls):
        return True

    @classmethod
    def configuration_schema(cls):
        return {}

    def annotate_query(self, query, metadata):
        if not self.should_annotate_query:
            return query

        annotation = ", ".join(["{}: {}".format(k, v) for k, v in metadata.items()])
        annotated_query = "/* {} */ {}".format(annotation, query)
        return annotated_query

    def test_connection(self):
        if self.noop_query is None:
            raise NotImplementedError()
        data, error = self.run_query(self.noop_query, None)

        if error is not None:
            raise Exception(error)

    def run_query(self, query, user):
        raise NotImplementedError()

    def fetch_columns(self, columns):
        column_names = []
        duplicates_counter = 1
        new_columns = []

        for col in columns:
            column_name = col[0]
            if column_name in column_names:
                column_name = "{}{}".format(column_name, duplicates_counter)
                duplicates_counter += 1

            column_names.append(column_name)
            new_columns.append(
                {"name": column_name, "friendly_name": column_name, "type": col[1]}
            )

        return new_columns

    def get_schema(self, get_stats=False):
        raise NotSupported()

    def _run_query_internal(self, query):
        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed running query [%s]." % query)
        return json_loads(results)["rows"]

    @classmethod
    def to_dict(cls):
        return {
            "name": cls.name(),
            "type": cls.type(),
            "configuration_schema": cls.configuration_schema(),
        }


class BaseSQLQueryRunner(BaseQueryRunner):
    def get_schema(self, get_stats=False):
        schema_dict = {}
        self._get_tables(schema_dict)
        if settings.SCHEMA_RUN_TABLE_SIZE_CALCULATIONS and get_stats:
            self._get_tables_stats(schema_dict)
        return list(schema_dict.values())

    def _get_tables(self, schema_dict):
        return []

    def _get_tables_stats(self, tables_dict):
        for t in tables_dict.keys():
            if type(tables_dict[t]) == dict:
                res = self._run_query_internal("select count(*) as cnt from %s" % t)
                tables_dict[t]["size"] = res[0]["cnt"]


class BaseHTTPQueryRunner(BaseQueryRunner):
    should_annotate_query = False
    response_error = "Endpoint returned unexpected status code"
    requires_authentication = False
    requires_url = True
    url_title = "URL base path"
    username_title = "HTTP Basic Auth Username"
    password_title = "HTTP Basic Auth Password"

    @classmethod
    def configuration_schema(cls):
        schema = {
            "type": "object",
            "properties": {
                "url": {"type": "string", "title": cls.url_title},
                "username": {"type": "string", "title": cls.username_title},
                "password": {"type": "string", "title": cls.password_title},
            },
            "secret": ["password"],
            "order": ["url", "username", "password"],
        }

        if cls.requires_url or cls.requires_authentication:
            schema["required"] = []

        if cls.requires_url:
            schema["required"] += ["url"]

        if cls.requires_authentication:
            schema["required"] += ["username", "password"]
        return schema

    def get_auth(self):
        username = self.configuration.get("username")
        password = self.configuration.get("password")
        if username and password:
            return (username, password)
        if self.requires_authentication:
            raise ValueError("Username and Password required")
        else:
            return None

    def get_response(self, url, auth=None, http_method="get", **kwargs):
        # Get authentication values if not given
        if auth is None:
            auth = self.get_auth()

        # Then call requests to get the response from the given endpoint
        # URL optionally, with the additional requests parameters.
        error = None
        response = None
        try:
            response = requests.request(http_method, url, auth=auth, **kwargs)
            # Raise a requests HTTP exception with the appropriate reason
            # for 4xx and 5xx response status codes which is later caught
            # and passed back.
            response.raise_for_status()

            # Any other responses (e.g. 2xx and 3xx):
            if response.status_code != 200:
                error = "{} ({}).".format(self.response_error, response.status_code)

        except requests.HTTPError as exc:
            logger.exception(exc)
            error = "Failed to execute query. " "Return Code: {} Reason: {}".format(
                response.status_code, response.text
            )
        except requests.RequestException as exc:
            # Catch all other requests exceptions and return the error.
            logger.exception(exc)
            error = str(exc)

        # Return response and error.
        return response, error


query_runners = {}


def register(query_runner_class):
    global query_runners
    if query_runner_class.enabled():
        logger.debug(
            "Registering %s (%s) query runner.",
            query_runner_class.name(),
            query_runner_class.type(),
        )
        query_runners[query_runner_class.type()] = query_runner_class
    else:
        logger.debug(
            "%s query runner enabled but not supported, not registering. Either disable or install missing "
            "dependencies.",
            query_runner_class.name(),
        )


def get_query_runner(query_runner_type, configuration):
    query_runner_class = query_runners.get(query_runner_type, None)
    if query_runner_class is None:
        return None

    return query_runner_class(configuration)


def get_configuration_schema_for_query_runner_type(query_runner_type):
    query_runner_class = query_runners.get(query_runner_type, None)
    if query_runner_class is None:
        return None

    return query_runner_class.configuration_schema()


def import_query_runners(query_runner_imports):
    for runner_import in query_runner_imports:
        __import__(runner_import)


def guess_type(value):
    if isinstance(value, bool):
        return TYPE_BOOLEAN
    elif isinstance(value, int):
        return TYPE_INTEGER
    elif isinstance(value, float):
        return TYPE_FLOAT

    return guess_type_from_string(value)


def guess_type_from_string(string_value):
    if string_value == "" or string_value is None:
        return TYPE_STRING

    try:
        int(string_value)
        return TYPE_INTEGER
    except (ValueError, OverflowError):
        pass

    try:
        float(string_value)
        return TYPE_FLOAT
    except (ValueError, OverflowError):
        pass

    if text_type(string_value).lower() in ("true", "false"):
        return TYPE_BOOLEAN

    try:
        parser.parse(string_value)
        return TYPE_DATETIME
    except (ValueError, OverflowError):
        pass

    return TYPE_STRING
