import logging

import datetime
from funcy import compact, project

from redash.utils.requests_session import requests_or_advocate, UnacceptableAddressException

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


class GraphQL(BaseHTTPQueryRunner):

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string", "default": "http://127.0.0.1:8123"},
                "token": {"type": "string"},
                "timeout": {
                    "type": "number",
                    "title": "Request Timeout",
                    "default": 30,
                },
                "verify": {
                    "type": "boolean",
                    "title": "Verify SSL certificate",
                    "default": True,
                },
            },
            "order": ["url", "token"],
            "required": [],
            "extra_options": ["timeout", "verify"],
            "secret": ["token"],
        }

    def __init__(self, configuration):
        super(JSON, self).__init__(configuration)
        self.syntax = "text"

    def test_connection(self):
        pass

    def _send_query(self, data, stream=False):
        url = self.configuration.get("url", "http://127.0.0.1/")
        try:
            verify = self.configuration.get("verify", True)
            r = requests.post(
                url,
                data=data.encode("utf-8","ignore"),
                stream=stream,
                timeout=self.configuration.get("timeout", 30),
                verify=verify,
            )
            if r.status_code != 200:
                raise Exception(r.text)
            # logging.warning(r.json())
            return r.json()
        except requests.RequestException as e:
            if e.response:
                details = "({}, Status Code: {})".format(
                    e.__class__.__name__, e.response.status_code
                )
            else:
                details = "({})".format(e.__class__.__name__)
            raise Exception("Connection error to: {} {}.".format(url, details))

    def run_query(self, query, user):
        if not isinstance(query, dict):
            raise QueryParseError(
                "Query should be a GraphQL query."
            )
        result = self._send_query(query)

        if error is not None:
            return None, error

        data = json_dumps(parse_json(response.json(), path, fields))

        if data:
            return data, None
        else:
            return None, "Got empty response from '{}'.".format(query["url"])


register(GraphQL)