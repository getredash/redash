import logging
import sys
from six import reraise
from redash.query_runner import BaseSQLQueryRunner, register
from redash.utils import json_dumps, json_loads

try:

    import pyodbc
    enabled = True

except ImportError:
    enabled = False

logger = logging.getLogger(__name__)

_configuration_schema = {
                "type": "object",
                "properties": {
                    "user": {
                        "type": "string",
                        "default": "_SYSTEM"
                    },
                    "password": {
                        "type": "string",
                        "default": "SYS"

                    },
                    "host": {
                        "type": "string",
                        "default": "172.19.0.1"
                    },
                    "port": {
                        "type": "number",
                        "default": "51773"
                    },

                    "namespace": {
                        "type": "string",
                        "title": "Namespace",
                        "default": "USER"
                    },

                    "maxtablenumber": {
                        "type": "number",
                        "title": "Maximum number of tables",
                        "default": "100"
                    },

                    "tablefilter": {
                        "type": "string",
                        "title": "Table Filter out, sep by ';'",
                        "default": "Ens%"
                    },
                },
                "order": ['host',
                          'port',
                          'namespace',
                          'user',
                          'password',
                          'maxtablenumber',
                          'tablefilter'
                          ],
                "required": ["host"],
                "secret": ["password"]
            }


cfg = _configuration_schema['properties']


class InterSysIris(BaseSQLQueryRunner):
    noop_query = "SELECT 1"

    @classmethod
    def configuration_schema(cls):
        return _configuration_schema

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def type(cls):
        return "intersysiris"

    @classmethod
    def name(cls):
        return "Intersystems IRIS"

    def __init__(self, configuration):
        super(InterSysIris, self).__init__(configuration)

    def _get_tables(self, schema):

        # how many tales names will return
        maxtablenumber = self.configuration.get('maxtablenumber')

        maxtablenumber = maxtablenumber if maxtablenumber is \
            not None and (len(str(maxtablenumber)) > 0) \
            else cfg['maxtablenumber']['default']

        # filter out system configration tables
        tablefilter = self.configuration.get('tablefilter')

        tablefilter = tablefilter if tablefilter is not \
            None and (len(str(tablefilter)) > 0) \
            else cfg['tablefilter']['default']

        tablefilter_str = ''

        if len(tablefilter) > 0:
            filters = tablefilter.replace(',', ';').replace(' ', '').split(';')
            tablefilter_str = ' '.join(["and (TABLE_SCHEMA not like '{}')".format(f) for f in filters if len(f) > 0])

        query_table = """
        SELECT '"' || TABLE_SCHEMA || '"."' || TABLE_NAME || '"' as tbl_name,
               TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        WHERE (TABLE_TYPE= 'BASE TABLE' or TABLE_TYPE='VIEW')  {}
        ORDER BY TABLE_TYPE DESC
        """.format(tablefilter_str)

        query_columns = "SELECT * from(%s) where 1=0"

        results, error = self.run_query(query_table, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json_loads(results)

        row_len = len(results['rows'])

        if row_len > maxtablenumber:
            row_len = maxtablenumber

        for row in results['rows'][:row_len]:
            table_name = row['tbl_name']
            schema[table_name] = {'name': table_name.replace('"', ''),
                                  'columns': []}
            results_table, error = self.run_query(
                                query_columns % (table_name, ),
                                None)
            results_table = json_loads(results_table)
            for row_column in results_table['columns']:
                schema[table_name]['columns'].append(row_column['name'])
            if error is not None:
                raise Exception("Failed getting schema.")

        return schema.values()

    def run_query(self, query, user):
        connection = None
        cursor = None

        try:
            user = self.configuration.get('user')
            password = self.configuration.get('password')
            host = self.configuration.get('host')
            port = self.configuration.get('port')
            namespace = self.configuration.get('namespace')
            cfg = InterSysIris.configuration_schema()['properties']
            user = user if user is not None and (len(user) >= 0) \
                else cfg['user']['default']
            password = password if password is not None and (len(password) > 0) \
                else cfg['password']['default']
            host = host if host is not None and (len(host) > 0) \
                else cfg['host']['default']
            port = port if port is not None and (len(str(port)) > 0) \
                else cfg['port']['default']
            namespace = namespace if namespace is not None and (len(namespace) > 0) \
                else cfg['namespace']['default']
            driver = "{InterSystems ODBC}"

            if host[-1] == '/':
                host = host[:-1]

            connection_string = \
                'DRIVER={};SERVER={};PORT={};DATABASE={};UID={};PWD={}' \
                .format(driver, host, port, namespace, user, password)

            connection = pyodbc.connect(connection_string)
            cursor = connection.cursor()
            cursor.execute(query)

            if cursor.description is not None:
                columns_raw = [col[0] for col in cursor.description]
                columns = self.fetch_columns([(i, None) for i in columns_raw])
                rows = cursor.fetchall()
                row_data = [dict(zip(columns_raw, row)) for row in rows]
                data = {'columns': columns, 'rows': row_data}
                error = None
                json_data = json_dumps(data)
            else:
                error = 'Query completed but it returned no data.'
                json_data = None

        except pyodbc.Error as e:
            try:
                error = e.args[1]
            except IndexError:
                error = e.args[0][1]
            json_data = None
        except KeyboardInterrupt:
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        except Exception:
            err_class = sys.exc_info()[1].__class__
            err_args = [arg.decode('utf-8') for arg in sys.exc_info()[1].args]
            unicode_err = err_class(*err_args)
            reraise(unicode_err, None, sys.exc_info()[2])
        finally:
            if cursor:
                cursor.close
            if connection:
                connection.close()
        return json_data, error


register(InterSysIris)
