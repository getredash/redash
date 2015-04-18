import sys
import json
import logging

from redash.utils import JSONEncoder
from redash.query_runner import *

logger = logging.getLogger(__name__)


class Mysql(BaseQueryRunner):
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
                'passwd': {
                    'type': 'string',
                    'title': 'Password'
                },
                'db': {
                    'type': 'string',
                    'title': 'Database name'
                },
                "port": {
                    "type": "number"
                },
            },
            'required': ['db']
        }

    @classmethod
    def enabled(cls):
        try:
            import MySQLdb
        except ImportError:
            return False

        return True

    def __init__(self, configuration_json):
        super(Mysql, self).__init__(configuration_json)

    def get_schema(self):
        query = """
        SELECT col.table_schema,
               col.table_name,
               col.column_name
        FROM `information_schema`.`columns` col
        INNER JOIN
          (SELECT table_schema,
                  TABLE_NAME
           FROM information_schema.tables
           WHERE table_type <> 'SYSTEM VIEW' AND table_schema NOT IN ('performance_schema', 'mysql')) tables ON tables.table_schema = col.table_schema
        AND tables.TABLE_NAME = col.TABLE_NAME;
        """

        results, error = self.run_query(query)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json.loads(results)

        schema = {}
        for row in results['rows']:
            if row['table_schema'] != self.configuration['db']:
                table_name = '{}.{}'.format(row['table_schema'], row['table_name'])
            else:
                table_name = row['table_name']

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['column_name'])

        return schema.values()

    def run_query(self, query):
        import MySQLdb

        connection = MySQLdb.connect(host=self.configuration.get('host', ''),
                                     user=self.configuration.get('user', ''),
                                     passwd=self.configuration.get('passwd', ''),
                                     db=self.configuration['db'],
                                     port=self.configuration.get('port', 3306),
                                     charset='utf8', use_unicode=True)
        cursor = connection.cursor()

        logger.debug("MySQL running query: %s", query)

        try:
            cursor.execute(query)

            data = cursor.fetchall()

            cursor_desc = cursor.description
            if cursor_desc is not None:
                num_fields = len(cursor_desc)
                column_names = [i[0] for i in cursor.description]

                rows = [dict(zip(column_names, row)) for row in data]

                # TODO: add types support
                columns = [{'name': col_name,
                            'friendly_name': col_name,
                            'type': None} for col_name in column_names]

                data = {'columns': columns, 'rows': rows}
                json_data = json.dumps(data, cls=JSONEncoder)
                error = None
            else:
                json_data = None
                error = "No data was returned."

            cursor.close()
        except MySQLdb.Error, e:
            json_data = None
            error = e.args[1]
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]
        finally:
            connection.close()

        return json_data, error

register(Mysql)
