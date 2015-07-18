import json
import logging
import sys

from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

try:
    from impala.dbapi import connect
    from dateutil import parser
    enabled = True
except ImportError, e:
    logger.exception(e)
    logger.warning("Missing dependencies. Please install impyla and dateutil.")
    logger.warning("You can use pip:   pip install impyla dateutil")
    enabled = False

COLUMN_NAME = 0
COLUMN_TYPE = 1

types_map = {
    'BIGINT': TYPE_INTEGER,
    'TINYINT': TYPE_INTEGER,
    'SMALLINT': TYPE_INTEGER,
    'INT': TYPE_INTEGER,
    'DOUBLE': TYPE_FLOAT,
    'DECIMAL': TYPE_FLOAT,
    'FLOAT': TYPE_FLOAT,
    'REAL': TYPE_FLOAT,
    'BOOLEAN': TYPE_BOOLEAN,
    'TIMESTAMP': TYPE_DATETIME,
    'CHAR': TYPE_STRING,
    'STRING': TYPE_STRING,
    'VARCHAR': TYPE_STRING
}


class Impala(BaseQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "protocol": {
                    "type": "string"
                },
                "database": {
                    "type": "string"
                },
                "host": {
                    "type": "string"
                },
                "port": {
                    "type": "number"
                },
                "host": {
                    "type": "string"
                },
                "use_ldap": {
                    "type": "boolean"
                },
                "ldap_user": {
                    "type": "string"
                },
                "ldap_user": {
                    "type": "string"
                },
                "ldap_password": {
                    "type": "string"
                },
                "timeout": {
                    "type": "number"
                }
            },
            "required": ["host"]
        }

    @classmethod
    def type(cls):
        return "impala"

    def __init__(self, configuration_json):
        super(Impala, self).__init__(configuration_json)

    def get_schema(self):
        #todo: implement :-)
        pass

    def run_query(self, query):
        connection = connect(host=self.configuration['host'], port=self.configurationp['port'],
                             protocol=self.configuration['protocol'], timeout=self.configuration['timeout'],
                             database=self.configuration['database'], use_ldap=self.configuration['use_ldap'],
                             ldap_user=self.configuration['ldap_user'], ldap_password=self.configuration['ldap_password'])

        cursor = connection.cursor()

        try:
            cursor.execute(query)

            column_names = []
            columns = []

            for column in cursor.description:
                column_name = column[COLUMN_NAME]
                column_names.append(column_name)

                columns.append({
                    'name': column_name,
                    'friendly_name': column_name,
                    'type': types_map.get(column[COLUMN_TYPE], None)
                })

            rows = [dict(zip(column_names, row)) for row in cursor]

            data = {'columns': columns, 'rows': rows}
            json_data = json.dumps(data, cls=JSONEncoder)
            error = None
            cursor.close()
        except KeyboardInterrupt:
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]
        finally:
            connection.close()

        return json_data, error

register(Impala)