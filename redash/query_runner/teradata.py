from redash.query_runner import *
from redash.utils import JSONEncoder, json_dumps, json_loads
import logging

logger = logging.getLogger(__name__)

try:
    import teradatasql
    enabled = True
except ImportError:
    enabled = False

types_map = {
    'str': TYPE_STRING,
    'int': TYPE_INTEGER,
    'Decimal': TYPE_FLOAT,
    'date': TYPE_DATE,
    'datetime': TYPE_DATETIME,
    'float': TYPE_FLOAT,
}

class Teradata(BaseSQLQueryRunner):
    noop_query = "help session"

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
                    'type': 'string'
                },
                'logmech': {
                    'type': 'string',
                    "default": "TD2"
                },
                'database': {
                    'type': 'string'
                }
            },
            "order": ["host", "user", "password", "logmech", "database"],
            'required': ["host",'user','password'],
            'secret': ['password']
        }


    @classmethod
    def name(cls):
        return "Teradata"

    @classmethod
    def enabled(cls):
        return enabled

    def get_schema(self, get_stats=False):
        logger.info('Teradata is trying to get schema')
        query = """
        SELECT col.DataBaseName AS TABLE_SCHEMA,
               col.TableName as TABLE_NAME,
               col.ColumnName AS COLUMN_NAME
        FROM DBC.ColumnsVX col
        WHERE (DataBaseName = '{database}' OR  '{database}' = '')
        """.format(database=self.configuration.get('database', ""))

        results, error = self._run_query_internal(query)

        if error is not None:
            results = json_loads(results)
            schema = {}
            for row in results['rows']:
                if row['DatabaseName'] != None:
                    table_name = '{}.{}'.format(row['DatabaseName'], row['TableName'])
                else:
                    table_name = row['TableName']

                if table_name not in schema:
                    schema[table_name] = {'name': table_name, 'columns': []}

                schema[table_name]['columns'].append(row['ColumnName'])

        return schema.values()

    def _get_connection(self):
        connection = teradatasql.connect(
            host=self.configuration.get('host', ''),
            user=self.configuration.get('user', ''),
            password=self.configuration.get('password', ''),
            logmech=self.configuration.get('logmech', ''),
            database=self.configuration.get('database', '')
        )

        return connection

    def run_query(self, query, user):
        connection = None
        try:
            with self._get_connection() as session:
                cursor = session.cursor()
                cursor.execute(query)
                desc = cursor.description
                data_ = cursor.fetchall()
            desc_new = [(col_name[0], type(val_type)) for col_name, val_type in zip(desc, data_[0])]
            if desc is not None:
                columns = self.fetch_columns([(i[0], types_map.get(i[1].__name__, None)) for i in desc_new])
                rows = [dict(zip((c['name'] for c in columns), row)) for row in data_]
                data = {'columns': columns, 'rows': rows}
                json_data = json_dumps(data)
                error = None
            else:
                json_data = None
                error = "No data was returned."
        except Exception as ex:
            error = ex.args[0].split('\n')[0]
            json_data = None
        finally:
            if connection:
                connection.close()
        return json_data, error

register(Teradata)
