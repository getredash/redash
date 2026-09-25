import os
import uuid
from unittest import TestCase
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
    A table whose table-level SELECT grant was revoked, but which still has a
    column-level SELECT grant, is queryable by the user and must still show up
    in schema introspection. See #7676.
    """

    def setUp(self):
        self.admin_params = _test_db_connection_params()
        suffix = uuid.uuid4().hex[:8]
        self.table_name = "grant_test_{}".format(suffix)
        self.role_name = "grant_test_role_{}".format(suffix)
        self.role_password = "grant_test_pw"

        self.admin_conn = psycopg2.connect(**self.admin_params)
        self.admin_conn.autocommit = True
        with self.admin_conn.cursor() as cur:
            cur.execute('CREATE TABLE "{}" (id integer, secret text)'.format(self.table_name))
            cur.execute("CREATE ROLE \"{}\" LOGIN PASSWORD '{}'".format(self.role_name, self.role_password))
            cur.execute('GRANT USAGE ON SCHEMA public TO "{}"'.format(self.role_name))
            cur.execute('REVOKE ALL ON "{}" FROM PUBLIC'.format(self.table_name))
            cur.execute('REVOKE ALL ON "{}" FROM "{}"'.format(self.table_name, self.role_name))
            cur.execute('GRANT SELECT (id) ON "{}" TO "{}"'.format(self.table_name, self.role_name))

    def tearDown(self):
        with self.admin_conn.cursor() as cur:
            cur.execute('DROP TABLE IF EXISTS "{}"'.format(self.table_name))
            cur.execute('REVOKE USAGE ON SCHEMA public FROM "{}"'.format(self.role_name))
            cur.execute('DROP ROLE IF EXISTS "{}"'.format(self.role_name))
        self.admin_conn.close()

    def test_table_with_only_column_level_select_grant_is_listed(self):
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

        self.assertIn(self.table_name, schema)
        self.assertEqual(schema[self.table_name]["columns"], [{"name": "id", "type": "integer"}])
