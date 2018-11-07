try:
    from pydruid.db import connect
    enabled = True
except ImportError:
    enabled = False

from redash.query_runner import BaseQueryRunner, register

class Druid(BaseQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "username": {
                    "type": "string"
                },
                "password": {
                    "type": "string"
                },
                "host": {
                    "type": "string",
                    "default": "localhost"
                },
                "port": {
                    "type": "number",
                    "default": 8082
                },
                "scheme": {
                    "type": "string",
                    "default": "http"
                }
            },
            "order": ['scheme', 'host', 'port', 'username', 'password'],
            "required": ['host'],
            "secret": ["password"]
        }

    @classmethod
    def enabled(cls):
        return enabled

    def run_query(self, query, user):
        pass

register(Druid)