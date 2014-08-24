"""
QueryRunner is the function that the workers use, to execute queries. This is the Redshift
(PostgreSQL in fact) version, but easily we can write another to support additional databases
(MySQL and others).

Because the worker just pass the query, this can be used with any data store that has some sort of
query language (for example: HiveQL).
"""
import logging
import json
import MySQLdb
import sys
from redash.utils import JSONEncoder

def mysql(connection_string):
    if connection_string.endswith(';'):
        connection_string = connection_string[0:-1]
    
    def query_runner(query):
        connections_params = [entry.split('=')[1] for entry in connection_string.split(';')]
        connection = MySQLdb.connect(*connections_params, charset="utf8", use_unicode=True)
        cursor = connection.cursor()

        logging.debug("mysql got query: %s", query)
        
        try:
            cursor.execute(query)
            
            data = cursor.fetchall()
            
            cursor_desc = cursor.description
            if (cursor_desc != None):
                num_fields = len(cursor_desc)
                column_names = [i[0] for i in cursor.description]
            
                rows = [dict(zip(column_names, row)) for row in data]

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
        
    
    return query_runner
