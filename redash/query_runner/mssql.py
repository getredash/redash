import json
import logging
import sys
import uuid

from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

try:
    import pymssql
    enabled = True
except ImportError:
    enabled = False

# from _mssql.pyx ## DB-API type definitions & http://www.freetds.org/tds.html#types ##
types_map = {
    1: TYPE_STRING,
    2: TYPE_BOOLEAN,
    3: TYPE_INTEGER,
    4: TYPE_DATETIME,
    5: TYPE_FLOAT,
}


class MSSQLJSONEncoder(JSONEncoder):
    def default(self, o):
        if isinstance(o, uuid.UUID):
            return str(o)
        return super(MSSQLJSONEncoder, self).default(o)


class SqlServer(BaseSQLQueryRunner):
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
                "tds_version": {
                    "type": "string",
                    "default": "7.0",
                    "title": "TDS Version"
                },
                "charset": {
                    "type": "string",
                    "default": "UTF-8",
                    "title": "Character Set"
                },
                "db": {
                    "type": "string",
                    "title": "Database Name"
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
        return "Microsoft SQL Server"

    @classmethod
    def type(cls):
        return "mssql"

    @classmethod
    def annotate_query(cls):
        return False

    def __init__(self, configuration):
        super(SqlServer, self).__init__(configuration)

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
            tds_version = self.configuration.get('tds_version', '7.0')
            charset = self.configuration.get('charset', 'UTF-8')

            if port != 1433:
                server = server + ':' + str(port)

            connection = pymssql.connect(server=server, user=user, password=password, database=db, tds_version=tds_version, charset=charset)

            if isinstance(query, unicode):
                query = query.encode(charset)

            cursor = connection.cursor()
            logger.debug("SqlServer running query: %s", query)

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
        except pymssql.Error as e:
            logging.exception(e)
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

register(SqlServer)
