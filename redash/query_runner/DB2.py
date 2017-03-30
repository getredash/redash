# -*- coding: utf-8 -*-
import sys
import json
import logging

from redash.utils import JSONEncoder
from redash.query_runner import *

try:
    import ibm_db_dbi
    import ibm_db

    types_map = {
       ibm_db_dbi.FLOAT: TYPE_FLOAT,
       ibm_db_dbi.NUMBER: TYPE_INTEGER,
       ibm_db_dbi.STRING: TYPE_STRING,
       ibm_db_dbi.DATE: TYPE_DATE,
       ibm_db_dbi.DATETIME: TYPE_DATETIME,
    }
    ENABLED = True
except ImportError:
    ENABLED = False

logger = logging.getLogger(__name__)


class Db2(BaseSQLQueryRunner):
    noop_query = "SELECT 1 FROM sysibm.sysdummy1 "

    @classmethod
    def enabled(cls):
        return True

    @classmethod
    def name(cls):
        return "IBM DB2"        

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



    def __init__(self, configuration):
        super(Db2, self).__init__(configuration)

    def _get_tables(self, schema):
        query = "select NAME,TBNAME,TBCREATOR from sysibm.syscolumns WHERE TBCREATOR NOT LIKE 'SYS%'"

        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json.loads(results)

        for row in results['rows']:
            table_name = '{}.{}'.format(row['TBCREATOR'].rstrip(), row['TBNAME'])

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['NAME'])

        return schema.values()

    def run_query(self, query, user):
        import ibm_db_dbi

        if query == "":
            json_data = None
            error = "Query is empty"
            return json_data, error

        connection = None
        try:
            conn_info = "DATABASE={};HOSTNAME={};PORT={};PROTOCOL=TCPIP;UID={};PWD={}".format(
                self.configuration.get('database', ''),
                self.configuration.get('host', ''),
                self.configuration.get('port', 60000),
                self.configuration.get('user', ''),
                self.configuration.get('password', ''))

            connection = ibm_db_dbi.connect(conn_info,"","")

            logger.debug("DB2 running query: %s", query)
            cursor = connection.cursor()
            cursor.execute(query)
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

register(Db2)
