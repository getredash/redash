import json
import logging
import sys
import uuid

from redash.query_runner import *
from redash.utils import JSONEncoder
from redash.query_runner.mssql import MSSQLJSONEncoder, types_map

logger = logging.getLogger(__name__)

try:
    import pyodbc
    enabled = True
except ImportError:
    enabled = False


class SQLServerODBC(BaseSQLQueryRunner):
    noop_query = "SELECT 1"

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
                "server": {
                    "type": "string",
                    "default": "127.0.0.1"
                },
                "port": {
                    "type": "number",
                    "default": 1433
                },
                "charset": {
                    "type": "string",
                    "default": "UTF-8",
                    "title": "Character Set"
                },
                "db": {
                    "type": "string",
                    "title": "Database Name"
                },
                "driver": {
                    "type": "string",
                    "title": "Driver Identifier",
                    "default": "{ODBC Driver 13 for SQL Server}"
                }
            },
            "required": ["db"],
            "secret": ["password"]
        }

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def name(cls):
        return "Microsoft SQL Server (ODBC)"

    @classmethod
    def type(cls):
        return "mssql_odbc"

    @classmethod
    def annotate_query(cls):
        return False

    def __init__(self, configuration):
        super(SQLServerODBC, self).__init__(configuration)

    def _get_tables(self, schema):
        query = """
        SELECT table_schema, table_name, column_name
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE table_schema NOT IN ('guest','INFORMATION_SCHEMA','sys','db_owner','db_accessadmin'
                                  ,'db_securityadmin','db_ddladmin','db_backupoperator','db_datareader'
                                  ,'db_datawriter','db_denydatareader','db_denydatawriter'
                                  );
        """

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json.loads(results)

        for row in results['rows']:
            if row['table_schema'] != self.configuration['db']:
                table_name = u'{}.{}'.format(row['table_schema'], row['table_name'])
            else:
                table_name = row['table_name']

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['column_name'])

        return schema.values()

    def run_query(self, query, user):
        connection = None

        try:
            server = self.configuration.get('server', '')
            user = self.configuration.get('user', '')
            password = self.configuration.get('password', '')
            db = self.configuration['db']
            port = self.configuration.get('port', 1433)
            charset = self.configuration.get('charset', 'UTF-8')
            driver = self.configuration.get('driver', '{ODBC Driver 13 for SQL Server}')

            connection_string_fmt = 'DRIVER={};PORT={};SERVER={};DATABASE={};UID={};PWD={}'
            connection_string = connection_string_fmt.format(driver,
                                                             port,
                                                             server,
                                                             db,
                                                             user,
                                                             password)
            connection = pyodbc.connect(connection_string)
            cursor = connection.cursor()
            logger.debug("SQLServerODBC running query: %s", query)
            cursor.execute(query)
            data = cursor.fetchall()

            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], types_map.get(i[1], None)) for i in cursor.description])
                rows = [dict(zip((c['name'] for c in columns), row)) for row in data]

                data = {'columns': columns, 'rows': rows}
                json_data = json.dumps(data, cls=MSSQLJSONEncoder)
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

register(SQLServerODBC)
