import os
import uuid
from unittest import SkipTest, TestCase
from urllib.parse import urlparse

import psycopg2

from redash.query_runner.pg import PostgreSQL, _parse_dsn, build_schema


class TestParameters(TestCase):
    def test_parse_dsn(self):
        configuration = {"dsn": "application_name=redash connect_timeout=5"}
        self.assertDictEqual(_parse_dsn(configuration), {"application_name": "redash", "connect_timeout": "5"})

    def test_parse_dsn_not_permitted(self):
        configuration = {"dsn": "password=xyz"}
        self.assertRaises(ValueError, _parse_dsn, configuration)


class TestBuildSchema(TestCase):
    def test_handles_dups_between_public_and_other_schemas(self):
        results = {
            "rows": [
                {
                    "table_schema": "public",
                    "table_name": "main.users",
                    "column_name": "id",
                },
                {"table_schema": "main", "table_name": "users", "column_name": "id"},
                {"table_schema": "main", "table_name": "users", "column_name": "name"},
            ]
        }

        schema = {}

        build_schema(results, schema)

        self.assertIn("main.users", schema.keys())
        self.assertListEqual(schema["main.users"]["columns"], ["id", "name"])
        self.assertIn('public."main.users"', schema.keys())
        self.assertListEqual(schema['public."main.users"']["columns"], ["id"])

    def test_build_schema_with_data_types(self):
        results = {
            "rows": [
                {"table_schema": "main", "table_name": "users", "column_name": "id", "data_type": "integer"},
                {"table_schema": "main", "table_name": "users", "column_name": "name", "data_type": "varchar"},
            ]
        }

        schema = {}

        build_schema(results, schema)

        self.assertListEqual(
            schema["main.users"]["columns"], [{"name": "id", "type": "integer"}, {"name": "name", "type": "varchar"}]
        )


def _test_db_connection_params():
    # The test suite already talks to a real Postgres instance for its own
    # database (REDASH_DATABASE_URL); reuse it to exercise the actual
    # information_schema/has_*_privilege query against a real role.
    url = urlparse(os.environ.get("REDASH_DATABASE_URL", "postgresql://postgres@127.0.0.1/tests"))
    return {
        "host": url.hostname or "127.0.0.1",
        "port": url.port or 5432,
        "user": url.username or "postgres",
        "password": url.password or "",
        "dbname": (url.path or "/tests").lstrip("/") or "tests",
    }


class TestGetTablesColumnLevelGrants(TestCase):
    """
    A table or materialized view whose table-level SELECT grant was revoked,
    but which still has a column-level SELECT grant, is queryable by the user
    and must still show up in schema introspection. See #7676.
    """

    def setUp(self):
        self.admin_params = _test_db_connection_params()
        suffix = uuid.uuid4().hex[:8]
        self.table_name = "grant_test_{}".format(suffix)
        self.matview_name = "grant_test_mv_{}".format(suffix)
        self.role_name = "grant_test_role_{}".format(suffix)
        self.role_password = "grant_test_pw"

        try:
            self.admin_conn = psycopg2.connect(**self.admin_params)
        except psycopg2.OperationalError as e:
            raise SkipTest("Postgres is not reachable: {}".format(e))
        self.addCleanup(self.admin_conn.close)
        self.admin_conn.autocommit = True

        with self.admin_conn.cursor() as cur:
            cur.execute("SELECT rolsuper OR rolcreaterole FROM pg_roles WHERE rolname = current_user")
            row = cur.fetchone()
        if not (row and row[0]):
            raise SkipTest("test database user cannot create roles")

        try:
            self._execute("CREATE ROLE \"{}\" LOGIN PASSWORD '{}'".format(self.role_name, self.role_password))
        except psycopg2.Error as e:
            raise SkipTest("cannot create test role: {}".format(e))
        self.addCleanup(self._execute, 'DROP ROLE IF EXISTS "{}"'.format(self.role_name))

        self._execute('GRANT USAGE ON SCHEMA public TO "{}"'.format(self.role_name))
        self.addCleanup(self._execute, 'REVOKE USAGE ON SCHEMA public FROM "{}"'.format(self.role_name))

    def _execute(self, sql):
        with self.admin_conn.cursor() as cur:
            cur.execute(sql)

    def _create_relation(self, kind, name, definition):
        try:
            self._execute('CREATE {} "{}" {}'.format(kind, name, definition))
        except psycopg2.Error as e:
            raise SkipTest("cannot create test {}: {}".format(kind.lower(), e))
        self.addCleanup(self._execute, 'DROP {} IF EXISTS "{}"'.format(kind, name))
        self._execute('REVOKE ALL ON "{}" FROM PUBLIC'.format(name))
        self._execute('REVOKE ALL ON "{}" FROM "{}"'.format(name, self.role_name))
        self._execute('GRANT SELECT (id) ON "{}" TO "{}"'.format(name, self.role_name))

    def _get_schema(self):
        query_runner = PostgreSQL(
            {
                "host": self.admin_params["host"],
                "port": self.admin_params["port"],
                "user": self.role_name,
                "password": self.role_password,
                "dbname": self.admin_params["dbname"],
            }
        )
        schema = {}
        query_runner._get_tables(schema)
        return schema

    def test_table_with_only_column_level_select_grant_is_listed(self):
        self._create_relation("TABLE", self.table_name, "(id integer, secret text)")

        schema = self._get_schema()

        self.assertIn(self.table_name, schema)
        self.assertEqual(schema[self.table_name]["columns"], [{"name": "id", "type": "integer"}])

    def test_materialized_view_with_only_column_level_select_grant_is_listed(self):
        self._create_relation(
            "MATERIALIZED VIEW", self.matview_name, "AS SELECT 1::integer AS id, 'x'::text AS secret"
        )

        schema = self._get_schema()

        self.assertIn(self.matview_name, schema)
        self.assertEqual(schema[self.matview_name]["columns"], ["id"])
