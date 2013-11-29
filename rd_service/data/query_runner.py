"""
QueryRunner is the function that the workers use, to execute queries. This is the Redshift
(PostgreSQL in fact) version, but easily we can write another to support additional databases
(MySQL and others).

Because the worker just pass the query, this can be used with any data store that has some sort of
query language (for example: HiveQL).
"""
import json
import psycopg2
import sys
from .utils import JSONEncoder


def redshift(connection_string):
    def column_friendly_name(column_name):
        return column_name

    def query_runner(query):
        connection = psycopg2.connect(connection_string)
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
            raise sys.exc_info()[1], None, sys.exc_info()[2]
        finally:
            connection.close()

        return json_data, error

    return query_runner
