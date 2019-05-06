import os
import logging
import select

import psycopg2
from psycopg2.extras import Range

from redash.query_runner import *
from redash.utils import JSONEncoder, json_dumps, json_loads

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


class PostgreSQLJSONEncoder(JSONEncoder):
    def default(self, o):
        if isinstance(o, Range):
            # From: https://github.com/psycopg/psycopg2/pull/779
            if o._bounds is None:
                return ''

            items = [
                o._bounds[0],
                str(o._lower),
                ', ',
                str(o._upper),
                o._bounds[1]
            ]

            return ''.join(items)

        return super(PostgreSQLJSONEncoder, self).default(o)


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

        results = json_loads(results)

        for row in results['rows']:
            if row['table_schema'] != 'public':
                table_name = u'{}.{}'.format(row['table_schema'], row['table_name'])
            else:
                table_name = row['table_name']

            if table_name not in schema:
                schema[table_name] = {'name': table_name, 'columns': []}

            schema[table_name]['columns'].append(row['column_name'])

    def _get_tables(self, schema):
        '''
        relkind constants per https://www.postgresql.org/docs/10/static/catalog-pg-class.html
        r = regular table
        v = view
        m = materialized view
        f = foreign table
        p = partitioned table (new in 10)
        ---
        i = index
        S = sequence
        t = TOAST table
        c = composite type
        '''

        query = """
        SELECT s.nspname as table_schema,
               c.relname as table_name,
               a.attname as column_name
        FROM pg_class c
        JOIN pg_namespace s
        ON c.relnamespace = s.oid
        AND s.nspname NOT IN ('pg_catalog', 'information_schema')
        JOIN pg_attribute a
        ON a.attrelid = c.oid
        AND a.attnum > 0
        AND NOT a.attisdropped
        WHERE c.relkind IN ('m', 'f', 'p')

        UNION

        SELECT table_schema,
               table_name,
               column_name
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        """

        self._get_definitions(schema, query)

        return schema.values()

    def _get_connection(self):
        connection = psycopg2.connect(user=self.configuration.get('user'),
                                      password=self.configuration.get('password'),
                                      host=self.configuration.get('host'),
                                      port=self.configuration.get('port'),
                                      dbname=self.configuration.get('dbname'),
                                      sslmode=self.configuration.get('sslmode'),
                                      async_=True)

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
                json_data = json_dumps(data, ignore_nan=True, cls=PostgreSQLJSONEncoder)
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
                                      async_=True)

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
        # https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_COLUMNS.html
        # Use HAS_SCHEMA_PRIVILEGE(), SVV_EXTERNAL_SCHEMAS and HAS_TABLE_PRIVILEGE() to filter
        # out tables the current user cannot access.
        # https://docs.aws.amazon.com/redshift/latest/dg/r_HAS_SCHEMA_PRIVILEGE.html
        # https://docs.aws.amazon.com/redshift/latest/dg/r_SVV_EXTERNAL_SCHEMAS.html
        # https://docs.aws.amazon.com/redshift/latest/dg/r_HAS_TABLE_PRIVILEGE.html
        query = """
        WITH tables AS (
            SELECT DISTINCT table_name,
                            table_schema,
                            column_name,
                            ordinal_position AS pos
            FROM svv_columns
            WHERE table_schema NOT IN ('pg_internal','pg_catalog','information_schema')
        )
        SELECT table_name, table_schema, column_name
        FROM tables
        WHERE
            HAS_SCHEMA_PRIVILEGE(table_schema, 'USAGE') AND
            (
                table_schema IN (SELECT schemaname FROM SVV_EXTERNAL_SCHEMAS) OR
                HAS_TABLE_PRIVILEGE('"' || table_schema || '"."' || table_name || '"', 'SELECT')
            )
        ORDER BY table_name, pos
        """

        self._get_definitions(schema, query)

        return schema.values()


class CockroachDB(PostgreSQL):

    @classmethod
    def type(cls):
        return "cockroach"

register(PostgreSQL)
register(Redshift)
register(CockroachDB)
