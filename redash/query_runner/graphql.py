import logging
import gql
from gql.transport.requests import RequestsHTTPTransport

from redash.utils import json_dumps
from redash.query_runner.json_ds import parse_json
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
        verify = self.configuration.get("verify", True)
        transport = RequestsHTTPTransport(url=url, verify=verify)
        client = gql.Client(transport=transport, fetch_schema_from_transport=True)
        query = gql.gql(data)
        r = client.execute(query)
        return r

    def run_query(self, query, user):
        result = self._send_query(query)
        logger.info("%s" % result)

        data = json_dumps(parse_json(result, None, []))

        if data:
            return data, None
        else:
            return None, "Got empty response from '{}'.".format(query["url"])


register(GraphQL)
