import json
import logging
import sys
import os

from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

try:
    import pyodbc
    enabled = True
    logger.warning("LD_LIBRARY_PATH: {}".format(os.environ.get('LD_LIBRARY_PATH')))
    logger.warning("ODBCINI: {}".format(os.environ.get('ODBCINI')))
    logger.warning("MAPRDRILLINI: {}".format(os.environ.get('MAPRDRILLINI')))
except ImportError, e:
    logger.warning("Missing dependencies. Please install pyodbc.")
    logger.warning("You can use pip: pip install pyodbc")
    enabled = False

COLUMN_NAME = 0
COLUMN_TYPE = 1

types_map = {
    'BIGINT': TYPE_INTEGER,
    'INTEGER': TYPE_INTEGER,
    'INT': TYPE_INTEGER,
    'DOUBLE': TYPE_FLOAT,
    'long': TYPE_INTEGER,
    'DECIMAL': TYPE_FLOAT,
    'DEC': TYPE_FLOAT,
    'NUMERIC': TYPE_FLOAT,
    'FLOAT': TYPE_FLOAT,
    'REAL': TYPE_FLOAT,
    'BOOLEAN': TYPE_BOOLEAN,
    'bool': TYPE_BOOLEAN,
    'TIMESTAMP': TYPE_DATETIME,
    'TIME': TYPE_DATETIME,
    'DATE': TYPE_DATETIME,
    'CHAR': TYPE_STRING,
    'STRING': TYPE_STRING,
    'str': TYPE_STRING,
    'VARCHAR': TYPE_STRING,
    'CHARACTER': TYPE_STRING,
    'CHARACTER VARYING': TYPE_STRING,
    # Unsure about the interval type
    'INTERVAL': TYPE_DATETIME,
}


class Drill(BaseQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "ConnectionType": {
                    "type": "string"
                },
                "AuthenticationType": {
                    "type": "string"
                },
                "host": {
                    "type": "string"
                },
                "port": {
                    "type": "number"
                },
                "ZKQuorum": {
                    "type": "string"
                },
                "ZKClusterID": {
                    "type": "string"
                },
            },
            "required": ["ConnectionType", "AuthenticationType"]
        }

    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def type(cls):
        return "drill"

    def __init__(self, configuration_json):
        super(Drill, self).__init__(configuration_json)

    def get_schema(self, get_stats=False):
        try:
            schemas_query = "select SCHEMA_NAME, TYPE from INFORMATION_SCHEMA.`SCHEMATA`"
            tables_query = "show tables in %s"
            files_query = "show files in %s"

            columns_query = "select * from %s.`%s` limit 1"
            schema = {}
            for schema_name, schema_type in map(lambda a: (a['SCHEMA_NAME'], a['TYPE']), self._run_query_internal(schemas_query)):
                # Bypassing drills default view, which should not be used if the data sources are properly defined
                if 'default' in schema_name:
                    continue
                elif schema_type == 'file':
                    query_to_run = files_query
                elif schema_type == 'table':
                    query_to_run = tables_query
                else:
                    continue

                for table_name in map(lambda a: a['name'], self._run_query_internal(query_to_run % schema_name)):
                    columns = map(lambda a: a['friendly_name'], self._run_query_internal_columns(columns_query % (schema_name, table_name)))

                    if schema_name != 'INFORMATION_SCHEMA' and schema_name != 'sys':
                        table_name = '{}.`{}`'.format(schema_name, table_name)

                    schema[table_name] = {'name': table_name, 'columns': columns}
        except Exception, e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]
        return schema.values()

    def run_query(self, query, description=False):

        connection = None
        try:
            if self.configuration.get('ConnectionType') == 'Direct':
                connection_string = 'DRIVER=MapR Drill ODBC Driver 64-bit;AdvancedProperties= {{HandshakeTimeout=0;QueryTimeout=0; TimestampTZDisplayTimezone=utc;ExcludedSchemas=sys, INFORMATION_SCHEMA;}};Catalog=DRILL;Schema=; ConnectionType=Direct;HOST={host};PORT={port};AuthenticationType = {AuthenticationType}'.format(**self.configuration.to_dict())
            elif self.configuration.get('ConnectionType') == 'ZooKeeper':
                connection_string = 'DRIVER=MapR Drill ODBC Driver 64-bit;AdvancedProperties= {{HandshakeTimeout=0;QueryTimeout=0; TimestampTZDisplayTimezone=utc;ExcludedSchemas=sys, INFORMATION_SCHEMA;}};Catalog=DRILL;Schema=; ConnectionType=ZooKeeper;ZKQuorum={ZKQuorum};ZKClusterID={ZKClusterID};AuthenticationType = {AuthenticationType}'.format(**self.configuration.to_dict())
            else:
                raise Exception('ConnectionType not allowed')

            connection = pyodbc.connect(connection_string, autocommit=True)

            cursor = connection.cursor()

            cursor.execute(query)

            column_names = []
            columns = []

            for column in cursor.description:
                column_name = column[0]
                column_names.append(column_name)

                columns.append({
                    'name': column_name,
                    'friendly_name': column_name,
                    'type': types_map.get(column[1].__name__, None)
                })

            rows = []

            for row in cursor:
                rows.append(dict(zip(column_names, row)))

            data = {'columns': columns, 'rows': rows}
            json_data = json.dumps(data, cls=JSONEncoder)
            error = None
            cursor.close()
        except KeyboardInterrupt:
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            logging.exception(e)
            raise sys.exc_info()[1], None, sys.exc_info()[2]
        finally:
            connection.close()

        return json_data, error

    def _run_query_internal_columns(self, query):
        results, error = self.run_query(query)

        if error is not None:
            raise Exception("Failed running query [%s]." % query)
        return json.loads(results)['columns']

register(Drill)