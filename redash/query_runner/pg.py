import json
import logging
import psycopg2
import select
import sys

from redash.query_runner import *
from redash.utils import JSONEncoder

logger = logging.getLogger(__name__)

types_map = {
    20: TYPE_INTEGER,
    21: TYPE_INTEGER,
    23: TYPE_INTEGER,
    700: TYPE_FLOAT,
    1700: TYPE_FLOAT,
    701: TYPE_FLOAT,
    16: TYPE_BOOLEAN,
    1082: TYPE_DATE,
    1114: TYPE_DATETIME,
    1184: TYPE_DATETIME,
    1014: TYPE_STRING,
    1015: TYPE_STRING,
    1008: TYPE_STRING,
    1009: TYPE_STRING,
    2951: TYPE_STRING
}


def _wait(conn):
    while 1:
        try:
            state = conn.poll()
            if state == psycopg2.extensions.POLL_OK:
                break
            elif state == psycopg2.extensions.POLL_WRITE:
                select.select([], [conn.fileno()], [])
            elif state == psycopg2.extensions.POLL_READ:
                select.select([conn.fileno()], [], [])
            else:
                raise psycopg2.OperationalError("poll() returned %s" % state)
        except select.error:
            raise psycopg2.OperationalError("select.error received")


class PostgreSQL(BaseQueryRunner):
    @classmethod
    def configuration_fields(cls):
        return 'user', 'password', 'host', 'port', 'dbname'

    def __init__(self, configuration_json):
        super(PostgreSQL, self).__init__(configuration_json)

        if 'dbname' not in self.configuration:
            raise ConfigurationError("Missing dbname")

        values = []
        for k, v in self.configuration.iteritems():
            values.append("{}={}".format(k, v))

        self.connection_string = " ".join(values)

    def run_query(self, query):
        connection = psycopg2.connect(self.connection_string, async=True)
        _wait(connection)

        cursor = connection.cursor()

        try:
            cursor.execute(query)
            _wait(connection)

            # While set would be more efficient here, it sorts the data which is not what we want, but due to the small
            # size of the data we can assume it's ok.
            column_names = []
            columns = []
            duplicates_counter = 1

            for column in cursor.description:
                # TODO: this deduplication needs to be generalized and reused in all query runners.
                column_name = column.name
                if column_name in column_names:
                    column_name += str(duplicates_counter)
                    duplicates_counter += 1

                column_names.append(column_name)

                columns.append({
                    'name': column_name,
                    'friendly_name': column_name,
                    'type': types_map.get(column.type_code, None)
                })

            rows = [dict(zip(column_names, row)) for row in cursor]

            data = {'columns': columns, 'rows': rows}
            json_data = json.dumps(data, cls=JSONEncoder)
            error = None
            cursor.close()
        except (select.error, OSError) as e:
            logging.exception(e)
            error = "Query interrupted. Please retry."
            json_data = None
        except psycopg2.DatabaseError as e:
            logging.exception(e)
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

register("pg", PostgreSQL)