import json

from redash.utils import JSONEncoder
from redash.query_runner import *

import logging
logger = logging.getLogger(__name__)

try:
    import tdclient
    enabled = True

except ImportError:
    enabled = False

TD_TYPES_MAPPING = {
    'bigint': TYPE_INTEGER,
    'tinyint': TYPE_INTEGER,
    'smallint': TYPE_INTEGER,
    'int': TYPE_INTEGER,
    'integer': TYPE_INTEGER,
    'long': TYPE_INTEGER,
    'double': TYPE_FLOAT,
    'decimal': TYPE_FLOAT,
    'float': TYPE_FLOAT,
    'real': TYPE_FLOAT,
    'boolean': TYPE_BOOLEAN,
    'timestamp': TYPE_DATETIME,
    'date': TYPE_DATETIME,
    'char': TYPE_STRING,
    'string': TYPE_STRING,
    'varchar': TYPE_STRING,
}


class TreasureData(BaseQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'endpoint': {
                    'type': 'string'
                },
                'apikey': {
                    'type': 'string'
                },
                'type': {
                    'type': 'string'
                },
                'db': {
                    'type': 'string',
                    'title': 'Database Name'
                },
                'get_schema': {
                    'type': 'boolean',
                    'title': 'Auto Schema Retrieval',
                    'default': False
                }
            },
            'required': ['apikey','db']
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def type(cls):
        return "treasuredata"

    def __init__(self, configuration):
        super(TreasureData, self).__init__(configuration)

    def get_schema(self, get_stats=False):
        schema = {}
        if self.configuration.get('get_schema', False):
            try:
                with tdclient.Client(self.configuration.get('apikey')) as client:
                    for table in client.tables(self.configuration.get('db')):
                        table_name = '{}.{}'.format(self.configuration.get('db'), table.name)
                        for table_schema in table.schema:
                            schema[table_name] = {
                                'name': table_name,
                                'columns': [column[0] for column in table.schema],
                            }
            except Exception, ex:
                raise Exception("Failed getting schema")
        return schema.values()

    def run_query(self, query, user):
        connection = tdclient.connect(
                endpoint=self.configuration.get('endpoint', 'https://api.treasuredata.com'),
                apikey=self.configuration.get('apikey'),
                type=self.configuration.get('type', 'hive').lower(),
                db=self.configuration.get('db'))

        cursor = connection.cursor()

        try:
            cursor.execute(query)
            columns_data = [(row[0], cursor.show_job()['hive_result_schema'][i][1]) for i,row in enumerate(cursor.description)]

            columns = [{'name': col[0],
                'friendly_name': col[0],
                'type': TD_TYPES_MAPPING.get(col[1], None)} for col in columns_data]

            rows = [dict(zip(([c[0] for c in columns_data]), r)) for i, r in enumerate(cursor.fetchall())]
            data = {'columns': columns, 'rows': rows}
            json_data = json.dumps(data, cls=JSONEncoder)
            error = None
        except Exception, ex:
            json_data = None
            error = ex.message

        return json_data, error

register(TreasureData)
