import datetime
import decimal
from unittest import TestCase, mock

import mssql_python

from redash.query_runner import TYPE_DATETIME, TYPE_FLOAT, TYPE_INTEGER, TYPE_STRING
from redash.query_runner.mssql import SqlServer
from redash.query_runner.mssql_odbc import SQLServerODBC


class TestConnectionParams(TestCase):
    def test_default_port_leaves_server_as_is(self):
        runner = SqlServer({"server": "db.example.com", "port": 1433, "user": "sa", "password": "pw", "db": "app"})

        self.assertEqual(
            runner._connection_params(),
            {
                "server": "db.example.com",
                "database": "app",
                "uid": "sa",
                "pwd": "pw",
                "encrypt": "no",
                "trustservercertificate": "yes",
            },
        )

    def test_named_instance_without_port(self):
        runner = SqlServer({"server": "HOST\\SQLEXPRESS", "db": "app"})

        self.assertEqual(runner._connection_params()["server"], "HOST\\SQLEXPRESS")

    def test_custom_port_is_appended(self):
        runner = SqlServer({"server": "db.example.com", "port": 14330, "db": "app"})

        self.assertEqual(runner._connection_params()["server"], "db.example.com,14330")

    def test_ssl_without_verification(self):
        runner = SqlServer({"server": "db", "db": "app", "use_ssl": True})
        params = runner._connection_params()

        self.assertEqual(params["encrypt"], "yes")
        self.assertEqual(params["trustservercertificate"], "yes")

    def test_ssl_with_verification(self):
        runner = SqlServer({"server": "db", "db": "app", "use_ssl": True, "verify_ssl": True})
        params = runner._connection_params()

        self.assertEqual(params["encrypt"], "yes")
        self.assertEqual(params["trustservercertificate"], "no")

    def test_legacy_pymssql_options_are_ignored(self):
        runner = SqlServer({"server": "db", "db": "app", "tds_version": "7.0", "charset": "UTF-8"})
        params = runner._connection_params()

        self.assertNotIn("tds_version", params)
        self.assertNotIn("charset", params)


class TestRunQuery(TestCase):
    def setUp(self):
        self.runner = SqlServer({"server": "db", "db": "app", "user": "sa", "password": "pw"})

    @mock.patch("redash.query_runner.mssql.mssql_python.connect")
    def test_returns_rows_and_columns(self, connect):
        cursor = connect.return_value.cursor.return_value
        cursor.description = [
            ("id", int, None, 10, 10, 0, False),
            ("name", str, None, 50, 50, 0, True),
            ("amount", decimal.Decimal, None, 10, 10, 2, True),
            ("created_at", datetime.datetime, None, 23, 23, 3, True),
        ]
        cursor.fetchall.return_value = [(1, "a", decimal.Decimal("1.50"), datetime.datetime(2026, 1, 1))]

        data, error = self.runner.run_query("SELECT * FROM t", None)

        self.assertIsNone(error)
        self.assertEqual(
            [(c["name"], c["type"]) for c in data["columns"]],
            [("id", TYPE_INTEGER), ("name", TYPE_STRING), ("amount", TYPE_FLOAT), ("created_at", TYPE_DATETIME)],
        )
        self.assertEqual(data["rows"][0]["name"], "a")
        connect.assert_called_once_with(autocommit=True, **self.runner._connection_params())
        connect.return_value.close.assert_called_once()

    @mock.patch("redash.query_runner.mssql.mssql_python.connect")
    def test_no_result_set(self, connect):
        connect.return_value.cursor.return_value.description = None

        data, error = self.runner.run_query("UPDATE t SET a = 1", None)

        self.assertIsNone(data)
        self.assertEqual(error, "No data was returned.")

    @mock.patch("redash.query_runner.mssql.mssql_python.connect")
    def test_driver_error_is_returned(self, connect):
        connect.side_effect = mssql_python.OperationalError("Connection failed", "Login failed for user 'sa'.")

        data, error = self.runner.run_query("SELECT 1", None)

        self.assertIsNone(data)
        self.assertEqual(error, "Login failed for user 'sa'.")


class TestSQLServerODBC(TestCase):
    def test_is_deprecated_alias(self):
        self.assertEqual(SQLServerODBC.type(), "mssql_odbc")
        self.assertTrue(SQLServerODBC.deprecated)
        self.assertTrue(SQLServerODBC.to_dict()["deprecated"])
        self.assertFalse(getattr(SqlServer, "deprecated"))

    def test_accepts_legacy_odbc_configuration(self):
        runner = SQLServerODBC(
            {
                "server": "db",
                "port": 1433,
                "user": "sa",
                "password": "pw",
                "db": "app",
                "charset": "UTF-8",
                "use_ssl": True,
                "verify_ssl": True,
            }
        )

        params = runner._connection_params()
        self.assertEqual(params["encrypt"], "yes")
        self.assertEqual(params["trustservercertificate"], "no")
