import json
import logging
import sys


from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

try:
    from dql import Engine, FragmentEngine
    from pyparsing import ParseException
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
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "region": {
                    "type": "string",
                    "default": "us-east-1"
                },
                "host": {
                    "type": "string",
                    "default": "Use for non standard endpoints."
                },
                "port": {
                    "type": "number",
                    "default": 80
                },
                "access_key": {
                    "type": "string",
                },
                "secret_key": {
                    "type": "string",
                },
                "is_secure": {
                    "type": "boolean",
                    "default": False,
                }
            },
            "required": ["access_key", "secret_key"],
            "secret": ["secret_key"]
        }

    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def type(cls):
        return "dynamodb_sql"

    @classmethod
    def name(cls):
        return "DynamoDB (with DQL)"

    def __init__(self, configuration):
        super(DynamoDBSQL, self).__init__(configuration)

    def _connect(self):
        engine = FragmentEngine()
        config = self.configuration.to_dict()

        if not config.get('region'):
            config['region'] = 'us-east-1'

        if config.get('host') == '':
            config['host'] = None

        return engine, engine.connect(**config)

    def _get_tables(self, schema):

        try:
            engine, _ = self._connect()

            for table in engine.describe_all():
                schema[table.name] = {'name': table.name, 'columns': table.attrs.keys()}

        except Exception as e:
            logging.exception(e)
            raise sys.exc_info()[1], None, sys.exc_info()[2]

    def run_query(self, query):
        connection = None
        try:
            engine, connection = self._connect()

            res_dict = engine.execute(query if str(query).endswith(';') else str(query)+';')

            columns = []
            rows = []
            for item in res_dict:

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
        except ParseException as e:
            error = u"Error parsing query at line {} (column {}):\n{}".format(e.lineno, e.column, e.line)
            json_data = None
        except (SyntaxError, RuntimeError) as e:
            error = e.message
            json_data = None
        except KeyboardInterrupt:
            if connection:
                connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]

        return json_data, error

register(DynamoDBSQL)
