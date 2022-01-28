import logging
import requests

from redash.query_runner.json_ds import parse_json

from redash.utils import json_dumps
from redash.query_runner import (
    BaseHTTPQueryRunner,
    register,
)

logger = logging.getLogger(__name__)


class QueryParseError(Exception):
    pass


class GraphQL(BaseHTTPQueryRunner):

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string", "default": "http://127.0.0.1/"},
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
        super(GraphQL, self).__init__(configuration)
        self.syntax = "text"

    def test_connection(self):
        pass

    def _send_query(self, data):
        url = self.configuration.get("url", "http://127.0.0.1/")
        try:
            verify = self.configuration.get("verify", True)
            headers = {
              'Content-Type': 'application/json'
            }
            r = requests.post(
                url,
                data=json_dumps({"query": data}),
                timeout=self.configuration.get("timeout", 30),
                verify=verify,
                headers=headers
            )
            if r.status_code != 200:
                raise Exception(r.text)
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
        # TODO: query validation

        result = self._send_query(query)
        logger.info("%s" % result)

        data = json_dumps(parse_json(result, "data", []))

        if data:
            return data, None
        else:
            return None, "Got empty response from '{}'.".format(query["url"])


register(GraphQL)
