import json
import psycopg2
import sys
from .utils import JSONEncoder


def redshift(connection_pool):
    def column_friendly_name(column_name):
        return column_name

    def query_runner(query):
        connection = connection_pool.getconn()
        cursor = connection.cursor()

        try:
            cursor.execute(query)

            column_names = [col.name for col in cursor.description]

            rows = [dict(zip(column_names, row)) for row in cursor]
            columns = [{'name': col.name,
                        'friendly_name': column_friendly_name(col.name),
                        'type': None} for col in cursor.description]

            data = {'columns': columns, 'rows': rows}
            json_data = json.dumps(data, cls=JSONEncoder)
            error = None
            cursor.close()
        except psycopg2.DatabaseError as e:
            connection.rollback()
            json_data = None
            error = e.message

        except Exception as e:
            connection.rollback()
            connection_pool.putconn(connection)
            raise sys.exc_info()[1], None, sys.exc_info()[2]

        connection_pool.putconn(connection)

        return json_data, error

    return query_runner
