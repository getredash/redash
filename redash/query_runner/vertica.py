import sys
import json
import logging

from redash.utils import JSONEncoder
from redash.query_runner import *

logger = logging.getLogger(__name__)

types_map = {
    5: TYPE_BOOLEAN,
    6: TYPE_INTEGER,
    7: TYPE_FLOAT,
    8: TYPE_STRING,
    9: TYPE_STRING,
    10: TYPE_DATE,
    11: TYPE_DATETIME,
    12: TYPE_DATETIME,
    13: TYPE_DATETIME,
    14: TYPE_DATETIME,
    15: TYPE_DATETIME,
    16: TYPE_FLOAT,
    17: TYPE_STRING,
    114: TYPE_DATETIME,
    115: TYPE_STRING,
    116: TYPE_STRING,
    117: TYPE_STRING
}


class Vertica(BaseSQLQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'host': {
                    'type': 'string'
                },
                'user': {
                    'type': 'string'
                },
                'password': {
                    'type': 'string',
                    'title': 'Password'
                },
                'database': {
                    'type': 'string',
                    'title': 'Database name'
                },
                "port": {
                    "type": "number"
                },
                "read_timeout": {
                    "type": "number",
                    "title": "Read Timeout"
                },                                
            },
            'required': ['database'],
            'secret': ['password']
        }

    @classmethod
    def enabled(cls):
        try:
            import vertica_python
        except ImportError:
            return False

        return True

    def __init__(self, configuration):
        super(Vertica, self).__init__(configuration)

    def _get_tables(self, schema):
        query = """
        Select table_schema, table_name, column_name from columns where is_system_table=false
        union all
        select table_schema, table_name, column_name from view_columns;
        """

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json.loads(results)

        for row in results['rows']:
            table_name = '{}.{}'.format(row['table_schema'], row['table_name'])

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['column_name'])

        return schema.values()

    def run_query(self, query, user):
        import vertica_python

        if query == "":
            json_data = None
            error = "Query is empty"
            return json_data, error

        connection = None
        try:
            conn_info = {
                'host': self.configuration.get('host', ''),
                'port': self.configuration.get('port', 5433),
                'user': self.configuration.get('user', ''),
                'password': self.configuration.get('password', ''),
                'database': self.configuration.get('database', ''),
                'read_timeout': self.configuration.get('read_timeout', 600)
            }
            connection = vertica_python.connect(**conn_info)
            cursor = connection.cursor()
            logger.debug("Vetica running query: %s", query)
            cursor.execute(query)

            # TODO - very similar to pg.py
            if cursor.description is not None:
                columns_data = [(i[0], i[1]) for i in cursor.description]

                rows = [dict(zip((c[0] for c in columns_data), row)) for row in cursor.fetchall()]
                columns = [{'name': col[0],
                            'friendly_name': col[0],
                            'type': types_map.get(col[1], None)} for col in columns_data]

                data = {'columns': columns, 'rows': rows}
                json_data = json.dumps(data, cls=JSONEncoder)
                error = None
            else:
                json_data = None
                error = "No data was returned."

            cursor.close()
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]
        finally:
            if connection:
                connection.close()

        return json_data, error

register(Vertica)
