from base64 import b64encode
from unittest import TestCase

import mock
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import (
    BestAvailableEncryption,
    Encoding,
    NoEncryption,
    PrivateFormat,
)

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
)
from redash.query_runner.snowflake import Snowflake


def generate_private_key_b64(password=None):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    encryption = BestAvailableEncryption(password) if password else NoEncryption()
    pem = key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, encryption)
    return b64encode(pem).decode()


class FakeCursor:
    """Minimal stand-in for snowflake.connector's DB-API cursor."""

    def __init__(self, description=None, rows=None):
        self.description = description or []
        self.rows = rows or []
        self.executed = []
        self.closed = False

    def execute(self, query):
        self.executed.append(query)

    def __iter__(self):
        return iter(self.rows)

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self, cursor):
        self._cursor = cursor
        self.closed = False

    def cursor(self):
        return self._cursor

    def close(self):
        self.closed = True


class TestDetermineType(TestCase):
    def test_maps_known_types(self):
        self.assertEqual(TYPE_INTEGER, Snowflake.determine_type(0, 0))
        self.assertEqual(TYPE_FLOAT, Snowflake.determine_type(1, 0))
        self.assertEqual(TYPE_STRING, Snowflake.determine_type(2, 0))
        self.assertEqual(TYPE_DATE, Snowflake.determine_type(3, 0))
        self.assertEqual(TYPE_DATETIME, Snowflake.determine_type(4, 0))
        self.assertEqual(TYPE_BOOLEAN, Snowflake.determine_type(13, 0))

    def test_scaled_number_is_a_float(self):
        self.assertEqual(TYPE_FLOAT, Snowflake.determine_type(0, 2))

    def test_unknown_type_is_none(self):
        self.assertIsNone(Snowflake.determine_type(999, 0))


class TestConnectionParameters(TestCase):
    def _connect_params(self, configuration):
        with mock.patch("snowflake.connector.connect") as connect:
            Snowflake(configuration)._get_connection()
        return connect.call_args.kwargs

    def test_us_west_does_not_pass_a_region(self):
        params = self._connect_params(
            {
                "account": "acc",
                "user": "user",
                "password": "pwd",
                "region": "us-west",
                "database": "db",
                "warehouse": "wh",
            }
        )

        self.assertIsNone(params["region"])
        self.assertEqual("acc.snowflakecomputing.com", params["host"])

    def test_region_is_part_of_the_host(self):
        params = self._connect_params(
            {
                "account": "acc",
                "user": "user",
                "password": "pwd",
                "region": "eu-central-1",
                "database": "db",
                "warehouse": "wh",
            }
        )

        self.assertEqual("eu-central-1", params["region"])
        self.assertEqual("acc.eu-central-1.snowflakecomputing.com", params["host"])

    def test_explicit_host_wins_over_the_derived_one(self):
        params = self._connect_params(
            {
                "account": "acc",
                "user": "user",
                "password": "pwd",
                "region": "eu-central-1",
                "host": "custom.example.com",
                "database": "db",
                "warehouse": "wh",
            }
        )

        self.assertEqual("custom.example.com", params["host"])

    def test_password_authentication(self):
        params = self._connect_params(
            {
                "account": "acc",
                "user": "user",
                "password": "pwd",
                "database": "db",
                "warehouse": "wh",
            }
        )

        self.assertEqual("pwd", params["password"])
        self.assertNotIn("private_key", params)

    def test_key_pair_authentication(self):
        params = self._connect_params(
            {
                "account": "acc",
                "user": "user",
                "private_key_File": generate_private_key_b64(),
                "database": "db",
                "warehouse": "wh",
            }
        )

        self.assertIn("private_key", params)
        self.assertNotIn("password", params)

    def test_key_pair_authentication_with_an_encrypted_key(self):
        params = self._connect_params(
            {
                "account": "acc",
                "user": "user",
                "private_key_File": generate_private_key_b64(b"secret"),
                "private_key_pwd": "secret",
                "database": "db",
                "warehouse": "wh",
            }
        )

        self.assertIn("private_key", params)

    def test_missing_credentials_raise(self):
        with self.assertRaises(Exception):
            self._connect_params(
                {
                    "account": "acc",
                    "user": "user",
                    "database": "db",
                    "warehouse": "wh",
                }
            )


class TestRunQuery(TestCase):
    def setUp(self):
        self.configuration = {
            "account": "acc",
            "user": "user",
            "password": "pwd",
            "database": "db",
            "warehouse": "wh",
        }
        self.cursor = FakeCursor(
            description=[
                ("ID", 0, None, None, None, 0, None),
                ("NAME", 2, None, None, None, None, None),
            ],
            rows=[(1, "foo"), (2, "bar")],
        )
        self.connection = FakeConnection(self.cursor)
        self.patcher = mock.patch("snowflake.connector.connect", return_value=self.connection)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)

    def test_returns_columns_and_rows(self):
        data, error = Snowflake(self.configuration).run_query("SELECT * FROM t", None)

        self.assertIsNone(error)
        self.assertEqual(
            [
                {"name": "ID", "friendly_name": "ID", "type": TYPE_INTEGER},
                {"name": "NAME", "friendly_name": "NAME", "type": TYPE_STRING},
            ],
            data["columns"],
        )
        self.assertEqual([{"ID": 1, "NAME": "foo"}, {"ID": 2, "NAME": "bar"}], data["rows"])

    def test_selects_warehouse_and_database_before_the_query(self):
        Snowflake(self.configuration).run_query("SELECT * FROM t", None)

        self.assertEqual(
            ["USE WAREHOUSE wh", "USE db", "SELECT * FROM t"],
            self.cursor.executed,
        )

    def test_closes_cursor_and_connection_on_failure(self):
        self.cursor.execute = mock.Mock(side_effect=RuntimeError("boom"))

        with self.assertRaises(RuntimeError):
            Snowflake(self.configuration).run_query("SELECT * FROM t", None)

        self.assertTrue(self.cursor.closed)
        self.assertTrue(self.connection.closed)

    def test_lower_case_columns_option(self):
        configuration = dict(self.configuration, lower_case_columns=True)

        data, _ = Snowflake(configuration).run_query("SELECT * FROM t", None)

        self.assertEqual(["id", "name"], [column["name"] for column in data["columns"]])
        self.assertEqual([{"id": 1, "name": "foo"}, {"id": 2, "name": "bar"}], data["rows"])


class TestGetSchema(TestCase):
    SHOW_COLUMNS_DESCRIPTION = [
        ("schema_name", 2, None, None, None, None, None),
        ("table_name", 2, None, None, None, None, None),
        ("column_name", 2, None, None, None, None, None),
        ("kind", 2, None, None, None, None, None),
    ]

    def _get_schema(self, database, rows):
        cursor = FakeCursor(description=self.SHOW_COLUMNS_DESCRIPTION, rows=rows)
        configuration = {
            "account": "acc",
            "user": "user",
            "password": "pwd",
            "database": database,
            "warehouse": "wh",
        }

        with mock.patch("snowflake.connector.connect", return_value=FakeConnection(cursor)):
            schema = Snowflake(configuration).get_schema()

        return schema, cursor

    def test_groups_columns_by_table_and_ignores_non_columns(self):
        schema, cursor = self._get_schema(
            "db",
            [
                ("public", "users", "id", "COLUMN"),
                ("public", "users", "name", "COLUMN"),
                ("public", "orders", "id", "COLUMN"),
                ("public", "some_stage", "whatever", "STAGE"),
            ],
        )

        self.assertEqual(
            [
                {"name": "public.users", "columns": ["id", "name"]},
                {"name": "public.orders", "columns": ["id"]},
            ],
            schema,
        )

    def test_does_not_use_a_warehouse(self):
        _, cursor = self._get_schema("db", [])

        self.assertEqual(["USE db", "SHOW COLUMNS IN DATABASE"], cursor.executed)

    def test_database_including_a_schema_narrows_the_scope(self):
        _, cursor = self._get_schema("db.public", [])

        self.assertEqual(["USE db.public", "SHOW COLUMNS"], cursor.executed)
