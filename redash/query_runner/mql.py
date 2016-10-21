import json

from . import BaseQueryRunner, register
from .mongodb import TYPES_MAP, TYPE_STRING

try:
    import pymongo
    from ognom import query_to_plan
    from website.server.utils import simplify
    enabled = True
except ImportError:
    enabled = False

def deduce_columns(rows):
    column_to_type = {}
    for row in rows:
        for column, value in row.iteritems():
            column_to_type[column] = TYPES_MAP.get(value.__class__, TYPE_STRING)
    return [{'name': column, 'friendly_name': column, 'type': type}
            for column, type in column_to_type.iteritems()]

class MQL(BaseQueryRunner):

    def __init__(self, configuration):
        super(MQL, self).__init__(configuration)
        self.syntax = 'sql'

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'uri': {
                    'type': 'string',
                    'title': 'Connection String'
                }
            },
            'required': ['uri']
        }
    def test_connection(self):
        conn = pymongo.MongoClient(self.configuration['uri'])
        if not conn.command("connectionStatus")["ok"]:
            raise Exception("MongoDB connection error")

    def run_query(self, query, user):
        conn = pymongo.MongoClient(self.configuration['uri'])
        # execute() returns a generator (that wraps a cursor)
        gen = query_to_plan(query).execute(conn)
        # simplify converts special MongoDB data types (ObjectId, Date, etc') to strings
        result = simplify(list(gen))
        return json.dumps({'columns': deduce_columns(result), 'rows': result}), None

register(MQL)
