"""
QueryRunner is the function that the workers use, to execute queries. This is the PostgreSQL
version, but easily we can write another to support additional databases (MySQL and others).

Because the worker just pass the query, this can be used with any data store that has some sort of
query language (for example: HiveQL).
"""
import json
import sys
import select

import psycopg2

from redash.utils import JSONEncoder


def pg(connection_string):
    def column_friendly_name(column_name):
        return column_name

    def wait(conn):
        while 1:
            state = conn.poll()
            if state == psycopg2.extensions.POLL_OK:
                break
            elif state == psycopg2.extensions.POLL_WRITE:
                select.select([], [conn.fileno()], [])
            elif state == psycopg2.extensions.POLL_READ:
                select.select([conn.fileno()], [], [])
            else:
                raise psycopg2.OperationalError("poll() returned %s" % state)

    def query_runner(query):
        connection = psycopg2.connect(connection_string, async=True)
        wait(connection)

        cursor = connection.cursor()

        try:
            cursor.execute(query)
            wait(connection)

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
            json_data = None
            error = e.message
        except KeyboardInterrupt:
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]
        finally:
            connection.close()

        return json_data, error

    return query_runner
