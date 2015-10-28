import json
import logging
import sqlite3
import sys

#from redash.query_runner import ValidationError
from redash.query_runner import BaseQueryRunner
#from redash.query_runner import TYPE_DATETIME
#from redash.query_runner import TYPE_BOOLEAN
#from redash.query_runner import TYPE_INTEGER
from redash.query_runner import TYPE_STRING
#from redash.query_runner import TYPE_DATE
#from redash.query_runner import TYPE_FLOAT
#from redash.query_runner import SUPPORTED_COLUMN_TYPES
from redash.query_runner import register
#from redash.query_runner import get_query_runner
#from redash.query_runner import import_query_runners

from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

class Sqlite(BaseQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "dbname": {
                    "type": "string",
                    "title": "Database Name"
                }
            },
            "required": ["dbname"],
        }

    @classmethod
    def type(cls):
        return "sqlite"

    def __init__(self, configuration_json):
        super(Sqlite, self).__init__(configuration_json)

        self._dbname = self.configuration['dbname']

    def get_schema(self):
        query_table = "select tbl_name from sqlite_master where type='table'"
        query_columns = "PRAGMA table_info(%s)"

        results, error = self.run_query(query_table)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json.loads(results)

        schema = {}
        for row in results['rows']:
            table_name = row['tbl_name']
            schema[table_name] = {'name': table_name, 'columns': []}
            results_table, error = self.run_query(query_columns % (table_name,))
            if error is not None:
                raise Exception("Failed getting schema.")

            results_table = json.loads(results_table)
            for row_column in results_table['rows']:
                schema[table_name]['columns'].append(row_column['name'])

        return schema.values()

    def run_query(self, query):
        connection = sqlite3.connect(self._dbname)

        cursor = connection.cursor()

        try:
            cursor.execute(query)

            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], None) for i in cursor.description])
                rows = [dict(zip((c['name'] for c in columns), row)) for row in cursor]

                data = {'columns': columns, 'rows': rows}
                error = None
                json_data = json.dumps(data, cls=JSONEncoder)
            else:
                error = 'Query completed but it returned no data.'
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

register(Sqlite)






