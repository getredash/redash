"""
Runs the SQL Server query runner against a real SQL Server.

Skipped unless REDASH_TEST_MSSQL_SERVER is set. In CI, the backend tests start
a SQL Server container next to Redash (see .ci/compose.ci.yaml). To run them
locally, start SQL Server and set REDASH_TEST_MSSQL_SERVER and
REDASH_TEST_MSSQL_PASSWORD (the sa password).
"""

import datetime
import decimal
import os
import time
import uuid
from unittest import TestCase, skipUnless

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
)
from redash.query_runner.mssql import SqlServer, mssql_python
from redash.query_runner.mssql_odbc import SQLServerODBC
from redash.utils import json_dumps, json_loads

SERVER = os.environ.get("REDASH_TEST_MSSQL_SERVER")
SA_PASSWORD = os.environ.get("REDASH_TEST_MSSQL_PASSWORD", "")
DATABASE = "redash_tests"
# A login whose password needs escaping in a connection string.
USER = "redash_tests"
USER_PASSWORD = "Pa;ss}w0rd={x}"


def admin_connection(database="master"):
    return mssql_python.connect(
        server=SERVER,
        database=database,
        uid="sa",
        pwd=SA_PASSWORD,
        encrypt="no",
        trustservercertificate="yes",
        autocommit=True,
    )


def wait_for_server(timeout=120):
    deadline = time.time() + timeout
    while True:
        try:
            admin_connection().close()
            return
        except mssql_python.Error:
            if time.time() > deadline:
                raise
            time.sleep(2)


@skipUnless(SERVER, "REDASH_TEST_MSSQL_SERVER isn't set")
class TestSqlServerIntegration(TestCase):
    @classmethod
    def setUpClass(cls):
        wait_for_server()

        connection = admin_connection()
        cursor = connection.cursor()
        cursor.execute("IF DB_ID('{0}') IS NULL CREATE DATABASE {0}".format(DATABASE))
        cursor.execute(
            "IF SUSER_ID('{0}') IS NULL CREATE LOGIN {0} WITH PASSWORD = '{1}', CHECK_POLICY = OFF".format(
                USER, USER_PASSWORD
            )
        )
        connection.close()

        connection = admin_connection(DATABASE)
        cursor = connection.cursor()
        cursor.execute(
            "IF USER_ID('{0}') IS NULL BEGIN CREATE USER {0} FOR LOGIN {0}; ALTER ROLE db_owner ADD MEMBER {0}; END".format(
                USER
            )
        )
        connection.close()

    def setUp(self):
        connection = admin_connection(DATABASE)
        cursor = connection.cursor()
        cursor.execute("DROP TABLE IF EXISTS events; CREATE TABLE events (id int PRIMARY KEY, name nvarchar(50))")
        connection.close()

    def runner(self, runner_class=SqlServer, **configuration):
        return runner_class(
            {
                "server": SERVER,
                "port": 1433,
                "user": USER,
                "password": USER_PASSWORD,
                "db": DATABASE,
                **configuration,
            }
        )

    def count_events(self):
        data, error = self.runner().run_query("SELECT COUNT(*) AS n FROM events", None)
        self.assertIsNone(error)
        return data["rows"][0]["n"]

    def test_connection(self):
        self.runner().test_connection()

    def test_column_types_and_values(self):
        data, error = self.runner().run_query(
            """
            SELECT
                CAST(1 AS int) AS int_col,
                CAST(9007199254740993 AS bigint) AS bigint_col,
                CAST(1.25 AS decimal(10, 2)) AS decimal_col,
                CAST(2.5 AS float) AS float_col,
                CAST(1 AS bit) AS bit_col,
                N'héllo שלום' AS nvarchar_col,
                CAST('2026-01-02T03:04:05.123' AS datetime2) AS datetime2_col,
                CAST('2026-01-02T03:04:05' AS datetime) AS datetime_col,
                CAST('2026-01-02' AS date) AS date_col,
                CAST('03:04:05' AS time) AS time_col,
                CAST('6F9619FF-8B86-D011-B42D-00C04FC964FF' AS uniqueidentifier) AS uuid_col,
                CAST(0x0102 AS varbinary(2)) AS varbinary_col,
                CAST(NULL AS int) AS null_col
            """,
            None,
        )

        self.assertIsNone(error)
        self.assertEqual(
            {column["name"]: column["type"] for column in data["columns"]},
            {
                "int_col": TYPE_INTEGER,
                "bigint_col": TYPE_INTEGER,
                "decimal_col": TYPE_FLOAT,
                "float_col": TYPE_FLOAT,
                "bit_col": TYPE_BOOLEAN,
                "nvarchar_col": TYPE_STRING,
                "datetime2_col": TYPE_DATETIME,
                "datetime_col": TYPE_DATETIME,
                "date_col": TYPE_DATE,
                "time_col": TYPE_STRING,
                "uuid_col": TYPE_STRING,
                "varbinary_col": TYPE_STRING,
                "null_col": TYPE_INTEGER,
            },
        )

        row = data["rows"][0]
        self.assertEqual(row["int_col"], 1)
        self.assertEqual(row["bigint_col"], 9007199254740993)
        self.assertEqual(row["decimal_col"], decimal.Decimal("1.25"))
        self.assertEqual(row["float_col"], 2.5)
        self.assertIs(row["bit_col"], True)
        self.assertEqual(row["nvarchar_col"], "héllo שלום")
        self.assertEqual(row["datetime2_col"], datetime.datetime(2026, 1, 2, 3, 4, 5, 123000))
        self.assertEqual(row["datetime_col"], datetime.datetime(2026, 1, 2, 3, 4, 5))
        self.assertEqual(row["date_col"], datetime.date(2026, 1, 2))
        self.assertEqual(row["time_col"], datetime.time(3, 4, 5))
        self.assertEqual(str(row["uuid_col"]).upper(), str(uuid.UUID("6F9619FF-8B86-D011-B42D-00C04FC964FF")).upper())
        self.assertEqual(row["varbinary_col"], b"\x01\x02")
        self.assertIsNone(row["null_col"])

        # Results are stored as JSON, so every value has to serialize.
        stored = json_loads(json_dumps(data))["rows"][0]
        self.assertEqual(stored["datetime2_col"], "2026-01-02T03:04:05.123")
        self.assertEqual(stored["varbinary_col"], "0102")

    def test_statement_without_result_set(self):
        data, error = self.runner().run_query("INSERT INTO events VALUES (1, N'a')", None)

        self.assertIsNone(data)
        self.assertEqual(error, "No data was returned.")
        # The write is still committed, as with the previous pymssql runner.
        self.assertEqual(self.count_events(), 1)

    def test_rows_after_row_count_results(self):
        data, error = self.runner().run_query(
            """
            CREATE TABLE #tmp (id int);
            INSERT INTO #tmp VALUES (1), (2);
            UPDATE #tmp SET id = id * 10;
            SELECT id FROM #tmp ORDER BY id;
            """,
            None,
        )

        self.assertIsNone(error)
        self.assertEqual(data["rows"], [{"id": 10}, {"id": 20}])

    def test_successful_batch_is_committed(self):
        data, error = self.runner().run_query(
            "INSERT INTO events VALUES (1, N'a'); SELECT COUNT(*) AS n FROM events", None
        )

        self.assertIsNone(error)
        self.assertEqual(data["rows"], [{"n": 1}])
        self.assertEqual(self.count_events(), 1)

    def test_failed_batch_is_rolled_back(self):
        data, error = self.runner().run_query("INSERT INTO events VALUES (1, N'a'); SELECT 1 / 0 AS n", None)

        self.assertIsNone(data)
        self.assertIn("Divide by zero", error)
        self.assertEqual(self.count_events(), 0)

    def test_query_error_is_returned(self):
        data, error = self.runner().run_query("SELECT * FROM no_such_table", None)

        self.assertIsNone(data)
        self.assertIn("no_such_table", error)

    def test_login_failure_is_returned(self):
        data, error = self.runner(password="wrong").run_query("SELECT 1", None)

        self.assertIsNone(data)
        self.assertIn("Login failed", error)

    def test_schema(self):
        schema = {table["name"]: table["columns"] for table in self.runner().get_schema()}

        self.assertEqual(schema["dbo.events"], ["id", "name"])

    def test_auto_limit(self):
        runner = self.runner()
        data, error = runner.run_query(
            runner.apply_auto_limit("SELECT value FROM GENERATE_SERIES(1, 2000)", True), None
        )

        self.assertIsNone(error)
        self.assertEqual(len(data["rows"]), 1000)

    def test_ssl_without_certificate_verification(self):
        data, error = self.runner(use_ssl=True).run_query(
            "SELECT encrypt_option FROM sys.dm_exec_connections WHERE session_id = @@SPID", None
        )

        self.assertIsNone(error)
        self.assertEqual(data["rows"], [{"encrypt_option": "TRUE"}])

    def test_ssl_with_certificate_verification_rejects_self_signed_certificate(self):
        data, error = self.runner(use_ssl=True, verify_ssl=True).run_query("SELECT 1 AS n", None)

        self.assertIsNone(data)
        self.assertIn("certificate", error.lower())

    def test_legacy_options_are_ignored(self):
        data, error = self.runner(tds_version="7.0", charset="UTF-8").run_query("SELECT 1 AS n", None)

        self.assertIsNone(error)
        self.assertEqual(data["rows"], [{"n": 1}])

    def test_deprecated_odbc_type(self):
        data, error = self.runner(SQLServerODBC, use_ssl=False).run_query("SELECT 1 AS n", None)

        self.assertIsNone(error)
        self.assertEqual(data["rows"], [{"n": 1}])
