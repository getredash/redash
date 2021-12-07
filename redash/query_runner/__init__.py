import logging

from contextlib import ExitStack
from dateutil import parser
from functools import wraps
import socket
import ipaddress
from urllib.parse import urlparse

from six import text_type
from sshtunnel import open_tunnel
from redash import settings, utils
from redash.utils import json_loads, query_is_select_no_limit, add_limit_to_query
from rq.timeouts import JobTimeoutException

from redash.utils.requests_session import requests_or_advocate, requests_session, UnacceptableAddressException


logger = logging.getLogger(__name__)

__all__ = [
    "BaseQueryRunner",
    "BaseHTTPQueryRunner",
    "InterruptException",
    "JobTimeoutException",
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

    @property
    def host(self):
        """Returns this query runner's configured host.
        This is used primarily for temporarily swapping endpoints when using SSH tunnels to connect to a data source.

        `BaseQueryRunner`'s naïve implementation supports query runner implementations that store endpoints using `host` and `port`
        configuration values. If your query runner uses a different schema (e.g. a web address), you should override this function.
        """
        if "host" in self.configuration:
            return self.configuration["host"]
        else:
            raise NotImplementedError()

    @host.setter
    def host(self, host):
        """Sets this query runner's configured host.
        This is used primarily for temporarily swapping endpoints when using SSH tunnels to connect to a data source.

        `BaseQueryRunner`'s naïve implementation supports query runner implementations that store endpoints using `host` and `port`
        configuration values. If your query runner uses a different schema (e.g. a web address), you should override this function.
        """
        if "host" in self.configuration:
            self.configuration["host"] = host
        else:
            raise NotImplementedError()

    @property
    def port(self):
        """Returns this query runner's configured port.
        This is used primarily for temporarily swapping endpoints when using SSH tunnels to connect to a data source.

        `BaseQueryRunner`'s naïve implementation supports query runner implementations that store endpoints using `host` and `port`
        configuration values. If your query runner uses a different schema (e.g. a web address), you should override this function.
        """
        if "port" in self.configuration:
            return self.configuration["port"]
        else:
            raise NotImplementedError()

    @port.setter
    def port(self, port):
        """Sets this query runner's configured port.
        This is used primarily for temporarily swapping endpoints when using SSH tunnels to connect to a data source.

        `BaseQueryRunner`'s naïve implementation supports query runner implementations that store endpoints using `host` and `port`
        configuration values. If your query runner uses a different schema (e.g. a web address), you should override this function.
        """
        if "port" in self.configuration:
            self.configuration["port"] = port
        else:
            raise NotImplementedError()

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
            **({"deprecated": True} if cls.deprecated else {}),
        }

    @property
    def supports_auto_limit(self):
        return False

    def apply_auto_limit(self, query_text, should_apply_auto_limit):
        return query_text

    def gen_query_hash(self, query_text, set_auto_limit=False):
        query_text = self.apply_auto_limit(query_text, set_auto_limit)
        return utils.gen_query_hash(query_text)


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

    @property
    def supports_auto_limit(self):
        return True

    def apply_auto_limit(self, query_text, should_apply_auto_limit):
        if should_apply_auto_limit:
            from redash.query_runner.databricks import split_sql_statements, combine_sql_statements
            queries = split_sql_statements(query_text)
            # we only check for last one in the list because it is the one that we show result
            last_query = queries[-1]
            if query_is_select_no_limit(last_query):
                queries[-1] = add_limit_to_query(last_query)
            return combine_sql_statements(queries)
        else:
            return query_text


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
            response = requests_session.request(http_method, url, auth=auth, **kwargs)
            # Raise a requests HTTP exception with the appropriate reason
            # for 4xx and 5xx response status codes which is later caught
            # and passed back.
            response.raise_for_status()

            # Any other responses (e.g. 2xx and 3xx):
            if response.status_code != 200:
                error = "{} ({}).".format(self.response_error, response.status_code)

        except requests_or_advocate.HTTPError as exc:
            logger.exception(exc)
            error = "Failed to execute query. " "Return Code: {} Reason: {}".format(
                response.status_code, response.text
            )
        except UnacceptableAddressException as exc:
            logger.exception(exc)
            error = "Can't query private addresses."
        except requests_or_advocate.RequestException as exc:
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

    if str(string_value).lower() in ("true", "false"):
        return TYPE_BOOLEAN

    try:
        parser.parse(string_value)
        return TYPE_DATETIME
    except (ValueError, OverflowError):
        pass

    return TYPE_STRING


def with_ssh_tunnel(query_runner, details):
    def tunnel(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                remote_host, remote_port = query_runner.host, query_runner.port
            except NotImplementedError:
                raise NotImplementedError(
                    "SSH tunneling is not implemented for this query runner yet."
                )

            stack = ExitStack()
            try:
                bastion_address = (details["ssh_host"], details.get("ssh_port", 22))
                remote_address = (remote_host, remote_port)
                auth = {
                    "ssh_username": details["ssh_username"],
                    **settings.dynamic_settings.ssh_tunnel_auth(),
                }
                server = stack.enter_context(
                    open_tunnel(
                        bastion_address, remote_bind_address=remote_address, **auth
                    )
                )
            except Exception as error:
                raise type(error)("SSH tunnel: {}".format(str(error)))

            with stack:
                try:
                    query_runner.host, query_runner.port = server.local_bind_address
                    result = f(*args, **kwargs)
                finally:
                    query_runner.host, query_runner.port = remote_host, remote_port

                return result

        return wrapper

    query_runner.run_query = tunnel(query_runner.run_query)

    return query_runner
