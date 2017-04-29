import json
import logging
import sys

from redash.query_runner import *
from redash.utils import JSONEncoder

try:
    import cx_Oracle

    TYPES_MAP = {
        cx_Oracle.DATETIME: TYPE_DATETIME,
        cx_Oracle.CLOB: TYPE_STRING,
        cx_Oracle.LOB: TYPE_STRING,
        cx_Oracle.FIXED_CHAR: TYPE_STRING,
        cx_Oracle.FIXED_NCHAR: TYPE_STRING,
        cx_Oracle.FIXED_UNICODE: TYPE_STRING,
        cx_Oracle.INTERVAL: TYPE_DATETIME,
        cx_Oracle.LONG_NCHAR: TYPE_STRING,
        cx_Oracle.LONG_STRING: TYPE_STRING,
        cx_Oracle.LONG_UNICODE: TYPE_STRING,
        cx_Oracle.NATIVE_FLOAT: TYPE_FLOAT,
        cx_Oracle.NCHAR: TYPE_STRING,
        cx_Oracle.NUMBER: TYPE_FLOAT,
        cx_Oracle.ROWID: TYPE_INTEGER,
        cx_Oracle.STRING: TYPE_STRING,
        cx_Oracle.TIMESTAMP: TYPE_DATETIME,
        cx_Oracle.UNICODE: TYPE_STRING,
    }


    ENABLED = True
except ImportError:
    ENABLED = False

logger = logging.getLogger(__name__)

class Oracle(BaseSQLQueryRunner):
    noop_query = "SELECT 1 FROM dual"

    @classmethod
    def get_col_type(cls, col_type, scale):
        if col_type == cx_Oracle.NUMBER:
            return TYPE_FLOAT if scale > 0 else TYPE_INTEGER
        else:
            return TYPES_MAP.get(col_type, None)

    @classmethod
    def enabled(cls):
        return ENABLED

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
                "host": {
                    "type": "string"
                },
                "port": {
                    "type": "number"
                },
                "servicename": {
                    "type": "string",
                    "title": "DSN Service Name"
                }
            },
            "required": ["servicename", "user", "password", "host", "port"],
            "secret": ["password"]
        }

    @classmethod
    def type(cls):
        return "oracle"

    def __init__(self, configuration):
        super(Oracle, self).__init__(configuration)

        dsn = cx_Oracle.makedsn(
            self.configuration["host"],
            self.configuration["port"],
            service_name=self.configuration["servicename"])

        self.connection_string = "{}/{}@{}".format(self.configuration["user"], self.configuration["password"], dsn)

    def _get_tables(self, schema):
        query = """
        SELECT
            all_tab_cols.OWNER,
            all_tab_cols.TABLE_NAME,
            all_tab_cols.COLUMN_NAME
        FROM all_tab_cols
        WHERE all_tab_cols.OWNER NOT IN('SYS','SYSTEM','ORDSYS','CTXSYS','WMSYS','MDSYS','ORDDATA','XDB','OUTLN','DMSYS','DSSYS','EXFSYS','LBACSYS','TSMSYS')
        """

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json.loads(results)

        for row in results['rows']:
            if row['OWNER'] != None:
                table_name = '{}.{}'.format(row['OWNER'], row['TABLE_NAME'])
            else:
                table_name = row['TABLE_NAME']

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['COLUMN_NAME'])

        return schema.values()

    @classmethod
    def _convert_number(cls, value):
        try:
            return int(value)
        except:
            return value

    @classmethod
    def output_handler(cls, cursor, name, default_type, length, precision, scale):
        if default_type in (cx_Oracle.CLOB, cx_Oracle.LOB):
            return cursor.var(cx_Oracle.LONG_STRING, 80000, cursor.arraysize)

        if default_type in (cx_Oracle.STRING, cx_Oracle.FIXED_CHAR):
            return cursor.var(unicode, length, cursor.arraysize)

        if default_type == cx_Oracle.NUMBER:
            if scale <= 0:
                return cursor.var(cx_Oracle.STRING, 255, outconverter=Oracle._convert_number, arraysize=cursor.arraysize)

    def run_query(self, query, user):
        connection = cx_Oracle.connect(self.connection_string)
        connection.outputtypehandler = Oracle.output_handler

        cursor = connection.cursor()

        try:
            cursor.execute(query)

            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], Oracle.get_col_type(i[1], i[5])) for i in cursor.description])
                rows = [dict(zip((c['name'] for c in columns), row)) for row in cursor]

                data = {'columns': columns, 'rows': rows}
                error = None
                json_data = json.dumps(data, cls=JSONEncoder)
            else:
                error = 'Query completed but it returned no data.'
                json_data = None
        except cx_Oracle.DatabaseError as err:
            logging.exception(err.message)
            error = "Query failed. {}.".format(err.message)
            json_data = None
        except KeyboardInterrupt:
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        except Exception as err:
            raise sys.exc_info()[1], None, sys.exc_info()[2]
        finally:
            connection.close()

        return json_data, error

register(Oracle)
