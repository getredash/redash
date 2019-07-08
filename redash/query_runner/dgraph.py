import json
import re

try:
    import pydgraph
    enabled = True
except ImportError:
    enabled = False

from redash.query_runner import BaseQueryRunner, register
from redash.query_runner import TYPE_STRING, TYPE_DATE, TYPE_DATETIME, TYPE_INTEGER, TYPE_FLOAT, TYPE_BOOLEAN
from redash.utils import json_dumps, json_loads

TYPES_MAP = {
    0: TYPE_INTEGER,
    1: TYPE_FLOAT,
    2: TYPE_STRING,
    3: TYPE_DATE,
    4: TYPE_DATETIME,
    5: TYPE_STRING,
    6: TYPE_DATETIME,
    13: TYPE_BOOLEAN
}


class Dgraph(BaseQueryRunner):
    noop_query = """
    {
      test() {
      }
    }
    """

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
                "servers": {
                    "type": "string"
                }
            },
            "order": ["servers", "user", "password"],
            "required": ["servers"],
            "secret": ["password"]
        }

    @classmethod
    def type(cls):
        return "dgraph"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def remove_comments(cls, s):
        """From https://stackoverflow.com/a/2319116

        Remove all occurrences streamed comments (/*COMMENT */) from string"""
        s = re.sub(re.compile("/\*.*?\*/", re.DOTALL), "", s)
        return s

    def run_query(self, query, user):

        # gotta remove comments because Dgraph uses '#' as a comment delimiter, not '/* */'
        query = Dgraph.remove_comments(query)
        servers = self.configuration.get('servers')

        client_stub = pydgraph.DgraphClientStub(servers)
        client = pydgraph.DgraphClient(client_stub)

        txn = client.txn(read_only=True)
        try:
            response_raw = txn.query(query)

            data = json.loads(response_raw.json)

            first_key = next(iter(data.keys()))
            first_node = data[first_key]

            # grab all the column names
            column_names = set().union(*first_node)
            # create a dict for column names in the format that the API wants
            # the type as 'string' is just a hack for now
            columns = [{'name': c, 'friendly_name': c, 'type': 'string'} for c in column_names]
            # finally, assemble both the columns and data
            data = {'columns': columns, 'rows': first_node}

            error = None
            json_data = json_dumps(data)
        finally:
            txn.discard()
            client_stub.close()

        return json_data, None

    def get_schema(self, get_stats=False):
        """Queries Dgraph for all the predicates, their types, their tokenizers, etc.

        Dgraph only has one schema, and there's no such things as columns"""
        query = "schema {}"

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        schema = {}
        results = json_loads(results)

        for row in results['schema']:
            table_name = row['predicate']

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

        return schema.values()


register(Dgraph)
