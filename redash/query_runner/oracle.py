import cx_Oracle
import json
import logging
import sys

from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

types_map = {
    cx_Oracle.DATETIME: TYPE_DATETIME,
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


class Oracle(BaseQueryRunner):
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
            "required": ["servicename"],
            "secret": ["password"]
        }

    @classmethod
    def type(cls):
        return "oracle"

    def __init__(self, configuration_json):
        super(Oracle, self).__init__(configuration_json)

        dsn = cx_Oracle.makedsn(
            self.configuration["host"],
            self.configuration["port"],
            service_name=self.configuration["servicename"])

        self.connection_string = "{}/{}@{}".format(self.configuration["user"], self.configuration["password"], dsn)

    def get_schema(self):
        query = """
        SELECT
            user_tables.tablespace_name,
            all_tab_cols.table_name,
            all_tab_cols.column_name
        FROM all_tab_cols
        JOIN user_tables ON (all_tab_cols.table_name = user_tables.table_name)
        """

        results, error = self.run_query(query)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json.loads(results)

        schema = {}
        for row in results['rows']:
            if row['tablespace_name'] != None:
                table_name = '{}.{}'.format(row['tablespace_name'], row['table_name'])
            else:
                table_name = row['table_name']

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['column_name'])

        return schema.values()

    def run_query(self, query):
        connection = cx_Oracle.connect(self.connection_string)

        cursor = connection.cursor()

        try:
            cursor.execute(query)

            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], types_map.get(i[1], None)) for i in cursor.description])
                rows = [dict(zip((c['name'] for c in columns), row)) for row in cursor]

                data = {'columns': columns, 'rows': rows}
                error = None
                json_data = json.dumps(data, cls=JSONEncoder)
            else:
                error = 'Query completed but it returned no data.'
                json_data = None
        except (select.error, OSError) as e:
            logging.exception(e)
            error = "Query interrupted. Please retry."
            json_data = None
        except KeyboardInterrupt:
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]
        finally:
            connection.close()

        return json_data, error

register(Oracle)
