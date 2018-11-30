import logging
import sqlite3
import sys

from six import reraise

from redash.query_runner import BaseSQLQueryRunner, register
from redash.utils import json_dumps, json_loads

logger = logging.getLogger(__name__)


class Sqlite(BaseSQLQueryRunner):
    noop_query = "pragma quick_check"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "dbpath": {
                    "type": "string",
                    "title": "Database Path"
                }
            },
            "required": ["dbpath"],
        }

    @classmethod
    def type(cls):
        return "sqlite"

    def __init__(self, configuration):
        super(Sqlite, self).__init__(configuration)

        self._dbpath = self.configuration['dbpath']

    def _get_tables(self, schema):
        query_table = "select tbl_name from sqlite_master where type='table'"
        query_columns = "PRAGMA table_info(%s)"

        results, error = self.run_query(query_table, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json_loads(results)

        for row in results['rows']:
            table_name = row['tbl_name']
            schema[table_name] = {'name': table_name, 'columns': []}
            results_table, error = self.run_query(query_columns % (table_name,), None)
            if error is not None:
                raise Exception("Failed getting schema.")

            results_table = json_loads(results_table)
            for row_column in results_table['rows']:
                schema[table_name]['columns'].append(row_column['name'])

        return schema.values()

    def run_query(self, query, user):
        connection = sqlite3.connect(self._dbpath)

        cursor = connection.cursor()

        try:
            cursor.execute(query)

            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], None) for i in cursor.description])
                rows = [dict(zip((c['name'] for c in columns), row)) for row in cursor]

                data = {'columns': columns, 'rows': rows}
                error = None
                json_data = json_dumps(data)
            else:
                error = 'Query completed but it returned no data.'
                json_data = None
        except KeyboardInterrupt:
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            # handle unicode error message
            err_class = sys.exc_info()[1].__class__
            err_args = [arg.decode('utf-8') for arg in sys.exc_info()[1].args]
            unicode_err = err_class(*err_args)
            reraise(unicode_err, None, sys.exc_info()[2])
        finally:
            connection.close()
        return json_data, error

register(Sqlite)
