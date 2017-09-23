import json
import logging
import sys
import uuid

from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

try:
    import pyodbc
    enabled = True
except ImportError:
    enabled = False

# https://github.com/mkleehammer/pyodbc/wiki/Data-Types#python-2
types_map = {
    "<type 'str'>": TYPE_STRING,
    "<type 'unicode'>": TYPE_STRING,
    "<type 'bytearray'>": TYPE_STRING,
    "<type 'buffer'>": TYPE_STRING,
    "<type 'bool'>": TYPE_BOOLEAN,
    "<type 'datetime.date'>": TYPE_DATE,
    "<type 'datetime.time'>": TYPE_DATETIME,
    "<type 'datetime.datetime'>": TYPE_DATETIME,
    "<type 'int'>": TYPE_INTEGER,
    "<type 'long'>": TYPE_FLOAT,
    "<type 'float'>": TYPE_FLOAT,
    "<type 'decimal'>": TYPE_FLOAT,
    "<type 'UUID.uuid'>": TYPE_STRING,
    "<class 'decimal.Decimal'>": TYPE_FLOAT,
}

class ODBC(BaseSQLQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "Connection String": {
                    "type": "string"
                }
            },
            "required": ["Connection String"],
            "secret": []
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def name(cls):
        return "ODBC"

    @classmethod
    def type(cls):
        return "odbc"

    @classmethod
    def annotate_query(cls):
        return False

    def __init__(self, configuration):
        super(ODBC, self).__init__(configuration)

    def _get_tables(self, schema):
        connection_string = self.configuration.get('Connection String', '')
        connection = pyodbc.connect(connection_string)
        cursor = connection.cursor()

        results = cursor.columns()

        for row in results:
            if row.table_name not in schema:
                schema[row.table_name] = {'name': row.table_name, 'columns': []}

            schema[row.table_name]['columns'].append(row.column_name)

        cursor.close()
        connection.close()

        return schema.values()

    def run_query(self, query, user):
        connection = None
        print "run_query"
        try:
            connection_string = self.configuration.get('Connection String', '')

            connection = pyodbc.connect(connection_string)
            cursor = connection.cursor()
            logger.debug("ODBC running query: %s", query)
            cursor.execute(query)
            data = cursor.fetchall()

            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], types_map.get(str(i[1]), None)) for i in cursor.description])
                rows = [dict(zip((c['name'] for c in columns), row)) for row in data]

                data = {'columns': columns, 'rows': rows}
                json_data = json.dumps(data, cls=JSONEncoder)
                error = None
            else:
                error = "No data was returned."
                json_data = None

            cursor.close()
        except pyodbc.Error as e:
            try:
                # Query errors are at `args[1]`
                error = e.args[1]
            except IndexError:
                # Connection errors are `args[0][1]`
                error = e.args[0][1]
            json_data = None
        except KeyboardInterrupt:
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]
        finally:
            if connection:
                connection.close()

        return json_data, error

register(ODBC)
