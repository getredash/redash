import sys
import json
import logging

from redash.utils import JSONEncoder
from redash.query_runner import *

logger = logging.getLogger(__name__)

"""
 NAME                  	TYPEID	REDASH TYPE 
 --------------------- 	------	 
FLOAT - DECFLOAT             	4 : TYPE_FLOAT,
FLOAT - DOUBLE               	8 :	TYPE_FLOAT,
FLOAT - REAL                 	10 : TYPE_FLOAT,
DECIMAL -  DECIMAL             	16 : TYPE_FLOAT,
BIGINT - BIGINT               	20 : TYPE_INTEGER,
NUMBER - INTEGER              	24 : TYPE_INTEGER,
NUMBER - SMALLINT             	28 : TYPE_INTEGER,
STRING - LONG VARCHAR         	52 : TYPE_STRING,
STRING - VARCHAR              	56 : TYPE_STRING,
STRING - CHARACTER            	60 : TYPE_STRING,
DATE -  DATE                 	100 : TYPE_DATE,
DATETIME - TIMESTAM            	108 : TYPE_DATETIME,
			BOOLEAN            	112 : TYPE_BOOLEAN 
"""
types_map = {
 	ibm_db_dbi.FLOAT : TYPE_FLOAT,
 	ibm_db_dbi.NUMBER : TYPE_INTEGER,
 	ibm_db_dbi.STRING : TYPE_STRING,
 	ibm_db_dbi.DATE : TYPE_DATE,
 	ibm_db_dbi.DATETIME : TYPE_DATETIME
	#ibm_db_dbi. : TYPE_BOOLEAN 
}


class DB2(BaseSQLQueryRunner):
    noop_query = "SELECT 1 FROM sysibm.sysdummy1 "

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
            import ibm_db
        except ImportError:
            return False

        return True

    def __init__(self, configuration):
        super(DB2, self).__init__(configuration)

    def _get_tables(self, schema):
        query = """
        Select 
			t.creator table_schema,
			t.name table_name,
			c.name column_name   
		FROM 
			sysibm.systables t
		INNER JOIN sysibm.syscolumns  c 
			on t.name=c.tbname 
			and t.creator=c.tbcreator
		WHERE 
			t.creator NOT LIKE 'SYS%';
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
        import ibm_db_dbi

        if query == "":
            json_data = None
            error = "Query is empty"
            return json_data, error

        connection = None
        try:
            conn_info = 
				"DATABASE={};HOSTNAME={};PORT={};PROTOCOL=TCPIP;UID={};PWD{}".format(
					self.configuration.get('database', ''),
					self.configuration.get('host', ''),
					self.configuration.get('port', 60000),
					self.configuration.get('user', ''),
					self.configuration.get('password', ''))
            connection = ibm_db_dbi.connect(conn_info,"","")
			logger.debug("DB2 running query: %s", query)
            cursor = connection.cursor()
			cursor.execute(sql)
            # Process results
			result = ibm_db.fetch_both(statement)
			
			# Get Column Data
			results.keys()
			
			# Loop over data
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

register(DB2)
