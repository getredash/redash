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

types_map = {
   'INTEGER': TYPE_INTEGER,
   'FLOAT': TYPE_FLOAT,
   'BOOLEAN': TYPE_BOOLEAN,
   'STRING': TYPE_STRING,
   'TIMESTAMP': TYPE_DATETIME,
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
        cursor = presto.connect(host=self.configuration['host'], schema='jp').cursor()

        try:
            cursor.execute(query)
            for i, row in enumerate(cursor.fetchone()):
              logger.debug(row)

            error = None
        except Exception, ex:
            json_data = None
            error = ex.message

        return json_data, error


register(Presto)
