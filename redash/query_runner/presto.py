import json

from redash.utils import JSONEncoder
from redash.query_runner import *

import logging
logger = logging.getLogger(__name__)

try:
    from pyhive import presto
    enabled = True

except ImportError:
    logger.warning("Missing dependencies. Please install PyHive.")
    logger.warning("You can use pip:   pip install pyhive")
    enabled = False

PRESTO_TYPES_MAPPING = {
    "integer" : TYPE_INTEGER,
    "long" : TYPE_INTEGER,
    "bigint" : TYPE_INTEGER,
    "float" : TYPE_FLOAT,
    "double" : TYPE_FLOAT,
    "boolean" : TYPE_BOOLEAN,
    "string" : TYPE_STRING,
    "varchar": TYPE_STRING,
    "date" : TYPE_DATE,
}

class Presto(BaseQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'host': {
                    'type': 'string'
                },
                'port': {
                    'type': 'number'
                },
                'schema': {
                    'type': 'string'
                },
                'catalog': {
                    'type': 'string'
                },
                'username': {
                    'type': 'string'
                }
            },
            'required': ['host']
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def type(cls):
        return "presto"

    def __init__(self, configuration_json):
        super(Presto, self).__init__(configuration_json)

    def run_query(self, query):
        connection = presto.connect(
                host=self.configuration.get('host', ''),
                port=self.configuration.get('port', 8080),
                username=self.configuration.get('username', 'redash'),
                catalog=self.configuration.get('catalog', 'hive'),
                schema=self.configuration.get('schema', 'default'))

        cursor = connection.cursor()

        try:
            cursor.execute(query)
            columns_data = [(row[0], row[1]) for row in cursor.description]

            columns = [{'name': col[0],
                'friendly_name': col[0],
                'type': PRESTO_TYPES_MAPPING.get(col[1], None)} for col in columns_data]

            rows = [dict(zip(([c[0] for c in columns_data]), r)) for i, r in enumerate(cursor.fetchall())]
            data = {'columns': columns, 'rows': rows}
            json_data = json.dumps(data, cls=JSONEncoder)
            error = None
        except Exception, ex:
            json_data = None
            error = ex.message

        return json_data, error

register(Presto)
