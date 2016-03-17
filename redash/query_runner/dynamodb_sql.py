import json
import logging
import sys

from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

try:
    from dql import Engine, FragmentEngine
    enabled = True
except ImportError, e:
    enabled = False

types_map = {
    'UNICODE': TYPE_INTEGER,
    'TINYINT': TYPE_INTEGER,
    'SMALLINT': TYPE_INTEGER,
    'INT': TYPE_INTEGER,
    'DOUBLE': TYPE_FLOAT,
    'DECIMAL': TYPE_FLOAT,
    'FLOAT': TYPE_FLOAT,
    'REAL': TYPE_FLOAT,
    'BOOLEAN': TYPE_BOOLEAN,
    'TIMESTAMP': TYPE_DATETIME,
    'DATE': TYPE_DATETIME,
    'CHAR': TYPE_STRING,
    'STRING': TYPE_STRING,
    'VARCHAR': TYPE_STRING
}


class DynamoDBSQL(BaseSQLQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "region": {
                    "type": "string",
                    "default": "us-west-1"
                },
                "host": {
                    "type": "string",
                    "default": "127.0.0.1"
                },
                "port": {
                    "type": "number",
                    "default": 8000
                },
                "access_key": {
                    "type": "string",
                    "default": "anything"

                },
                "secret_key": {
                    "type": "string",
                    "default": "anything"

                },
                "is_secure": {
                    "type": "boolean",
                    "default": False,
                }
            },
            "required": ["host"],
            "secret": ["secret_key"]
        }

    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def type(cls):
        return "ddb_sql"

    def __init__(self, configuration):
        super(DynamoDBSQL, self).__init__(configuration)

    def _get_tables(self, schema):

        try:
            engine = FragmentEngine()
            engine.connect(**self.configuration.to_dict())

            for table in engine.describe_all():
                schema[table.name] = {'name': table.name, 'columns': table.attrs.keys()}

        except Exception as e:
            logging.exception(e)
            raise sys.exc_info()[1], None, sys.exc_info()[2]

    def run_query(self, query):

        connection = None
        try:
            engine = FragmentEngine()
            connection = engine.connect(**self.configuration.to_dict())

            resDict = engine.execute(query if str(query).endswith(';') else str(query)+';')

            columns = []
            rows = []
            for item in resDict:

                if not columns:
                    for k, v in item.iteritems():
                        columns.append({
                            'name': k,
                            'friendly_name': k,
                            'type': types_map.get(str(type(v)).upper(), None)
                        })
                rows.append(item)

            data = {'columns': columns, 'rows': rows}
            json_data = json.dumps(data, cls=JSONEncoder)
            error = None
        except KeyboardInterrupt:
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            logging.exception(e)
            raise sys.exc_info()[1], None, sys.exc_info()[2]

        return json_data, error

register(DynamoDBSQL)
