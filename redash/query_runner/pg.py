import os
import json
import logging
import select

import psycopg2

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


def _wait(conn, timeout=None):
    while 1:
        try:
            state = conn.poll()
            if state == psycopg2.extensions.POLL_OK:
                break
            elif state == psycopg2.extensions.POLL_WRITE:
                select.select([], [conn.fileno()], [], timeout)
            elif state == psycopg2.extensions.POLL_READ:
                select.select([conn.fileno()], [], [], timeout)
            else:
                raise psycopg2.OperationalError("poll() returned %s" % state)
        except select.error:
            raise psycopg2.OperationalError("select.error received")


class PostgreSQL(BaseSQLQueryRunner):
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
                "host": {
                    "type": "string",
                    "default": "127.0.0.1"
                },
                "port": {
                    "type": "number",
                    "default": 5432
                },
                "dbname": {
                    "type": "string",
                    "title": "Database Name"
                },
                "sslmode": {
                   "type": "string",
                   "title": "SSL Mode",
                   "default": "prefer"
                }
            },
            "order": ['host', 'port', 'user', 'password'],
            "required": ["dbname"],
            "secret": ["password"]
        }

    @classmethod
    def type(cls):
        return "pg"

    def _get_definitions(self, schema, query):
        results, error = self.run_query(query, None)

        if error is not None:
            raise Exception("Failed getting schema.")

        results = json.loads(results)

        for row in results['rows']:
            if row['table_schema'] != 'public':
                table_name = '{}.{}'.format(row['table_schema'], row['table_name'])
            else:
                table_name = row['table_name']

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['column_name'])

    def _get_tables(self, schema):
        query = """
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema');
        """

        self._get_definitions(schema, query)

        materialized_views_query = """
        SELECT ns.nspname as table_schema,
               mv.relname as table_name,
               atr.attname as column_name
        FROM pg_class mv
          JOIN pg_namespace ns ON mv.relnamespace = ns.oid
          JOIN pg_attribute atr
            ON atr.attrelid = mv.oid
           AND atr.attnum > 0
           AND NOT atr.attisdropped
        WHERE mv.relkind = 'm';
        """

        self._get_definitions(schema, materialized_views_query)

        return schema.values()

    def _get_connection(self):
        connection = psycopg2.connect(user=self.configuration.get('user'),
                                      password=self.configuration.get('password'),
                                      host=self.configuration.get('host'),
                                      port=self.configuration.get('port'),
                                      dbname=self.configuration.get('dbname'),
                                      sslmode=self.configuration.get('sslmode'),
                                      async=True)

        return connection

    def run_query(self, query, user):
        connection = self._get_connection()
        _wait(connection, timeout=10)

        cursor = connection.cursor()

        try:
            cursor.execute(query)
            _wait(connection)

            if cursor.description is not None:
                columns = self.fetch_columns([(i[0], types_map.get(i[1], None)) for i in cursor.description])
                rows = [dict(zip((c['name'] for c in columns), row)) for row in cursor]

                data = {'columns': columns, 'rows': rows}
                error = None
                json_data = json.dumps(data, cls=JSONEncoder)
            else:
                error = 'Query completed but it returned no data.'
                json_data = None
        except (select.error, OSError) as e:
            error = "Query interrupted. Please retry."
            json_data = None
        except psycopg2.DatabaseError as e:
            error = e.message
            json_data = None
        except (KeyboardInterrupt, InterruptException):
            connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        finally:
            connection.close()

        return json_data, error


class Redshift(PostgreSQL):
    @classmethod
    def type(cls):
        return "redshift"

    def _get_connection(self):
        sslrootcert_path = os.path.join(os.path.dirname(__file__), './files/redshift-ca-bundle.crt')

        connection = psycopg2.connect(user=self.configuration.get('user'),
                                      password=self.configuration.get('password'),
                                      host=self.configuration.get('host'),
                                      port=self.configuration.get('port'),
                                      dbname=self.configuration.get('dbname'),
                                      sslmode=self.configuration.get('sslmode', 'prefer'),
                                      sslrootcert=sslrootcert_path,
                                      async=True)

        return connection

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
                "host": {
                    "type": "string"
                },
                "port": {
                    "type": "number"
                },
                "dbname": {
                    "type": "string",
                    "title": "Database Name"
                },
                "sslmode": {
                   "type": "string",
                   "title": "SSL Mode",
                   "default": "prefer"
                }
            },
            "order": ['host', 'port', 'user', 'password'],
            "required": ["dbname", "user", "password", "host", "port"],
            "secret": ["password"]
        }

    def _get_tables(self, schema):
        # Use svv_columns to include internal & external (Spectrum) tables and views data for Redshift
        # http://docs.aws.amazon.com/redshift/latest/dg/r_SVV_COLUMNS.html
        # Use PG_GET_LATE_BINDING_VIEW_COLS to include schema for late binding views data for Redshift
        # http://docs.aws.amazon.com/redshift/latest/dg/PG_GET_LATE_BINDING_VIEW_COLS.html
        query = """
        SELECT DISTINCT table_name, table_schema, column_name
        FROM svv_columns
        WHERE table_schema NOT IN ('pg_internal','pg_catalog','information_schema')
        UNION ALL
        SELECT DISTINCT view_name::varchar AS table_name,
                        view_schema::varchar AS table_schema,
                        col_name::varchar AS column_name
        FROM pg_get_late_binding_view_cols()
             cols(view_schema name, view_name name, col_name name, col_type varchar, col_num int);
        """

        self._get_definitions(schema, query)

        return schema.values()


class CockroachDB(PostgreSQL):
    def __init__(self, configuration):
        super(CockroachDB, self).__init__(configuration)

    @classmethod
    def type(cls):
        return "cockroach"

register(PostgreSQL)
register(Redshift)
register(CockroachDB)
