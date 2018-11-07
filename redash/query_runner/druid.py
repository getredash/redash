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
                "user": {
                    "type": "string"
                },
                "password": {
                    "type": "string"
                },
                "host": {
                    "type": "string",
                    "default": "127.0.0.1"
                },
                "port": {
                    "type": "number",
                    "default": 50000
                },
                "dbname": {
                    "type": "string",
                    "title": "Database Name"
                }
            },
            "order": ['host', 'port', 'user', 'password', 'dbname'],
            "required": ["dbname"],
            "secret": ["password"]
        }

    @classmethod
    def enabled(cls):
        return enabled

    def run_query(self, query, user):
        pass

register(Druid)