from collections import namedtuple
from unittest import TestCase, mock

from redash.query_runner import (
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    split_sql_statements,
)
from redash.query_runner.databricks import Databricks, _normalize_host

TableRow = namedtuple("TableRow", ["TABLE_CAT", "TABLE_SCHEM", "TABLE_NAME", "TABLE_TYPE"])
ColumnRow = namedtuple(
    "ColumnRow", ["TABLE_CAT", "TABLE_SCHEM", "TABLE_NAME", "COLUMN_NAME", "DATA_TYPE", "TYPE_NAME"]
)

CONFIGURATION = {
    "host": "https://dbc-12345.cloud.databricks.com/",
    "http_path": "/sql/1.0/warehouses/abc",
    "http_password": "dapi-token",
}


def _mock_connection(connect):
    connection = connect.return_value.__enter__.return_value
    return connection.cursor.return_value.__enter__.return_value


@mock.patch("redash.query_runner.databricks.databricks_sql.connect")
class TestDatabricksConnection(TestCase):
    def test_connects_with_python_connector(self, connect):
        cursor = _mock_connection(connect)
        cursor.description = None

        Databricks(CONFIGURATION).run_query("SELECT 1", None)

        kwargs = connect.call_args.kwargs
        self.assertEqual(kwargs["server_hostname"], "dbc-12345.cloud.databricks.com")
        self.assertEqual(kwargs["http_path"], "/sql/1.0/warehouses/abc")
        self.assertEqual(kwargs["access_token"], "dapi-token")
        self.assertTrue(kwargs["user_agent_entry"].startswith("Redash/"))

    def test_run_query_returns_rows_and_types(self, connect):
        cursor = _mock_connection(connect)
        cursor.description = [
            ("id", "bigint", None, None, None, None, None),
            ("name", "string", None, None, None, None, None),
            ("amount", "decimal", None, None, 10, 2, None),
            ("created_at", "timestamp", None, None, None, None, None),
            ("tags", "array", None, None, None, None, None),
        ]
        cursor.fetchmany.return_value = [(1, "a", 1.5, "2024-01-01", "[]")]

        data, error = Databricks(CONFIGURATION).run_query("SELECT 1; SELECT * FROM t", None)

        self.assertIsNone(error)
        self.assertEqual(cursor.execute.call_count, 2)
        self.assertEqual(
            [(c["name"], c["type"]) for c in data["columns"]],
            [
                ("id", TYPE_INTEGER),
                ("name", TYPE_STRING),
                ("amount", TYPE_FLOAT),
                ("created_at", TYPE_DATETIME),
                ("tags", TYPE_STRING),
            ],
        )
        self.assertEqual(
            data["rows"], [{"id": 1, "name": "a", "amount": 1.5, "created_at": "2024-01-01", "tags": "[]"}]
        )
        self.assertNotIn("truncated", data)

    def test_run_query_without_results(self, connect):
        cursor = _mock_connection(connect)
        cursor.description = None

        data, error = Databricks(CONFIGURATION).run_query("CREATE TABLE t (a INT)", None)

        self.assertIsNone(error)
        self.assertEqual(data["rows"], [{"result": "No data was returned."}])

    def test_run_query_returns_error_message(self, connect):
        from databricks.sql.exc import ServerOperationError

        cursor = _mock_connection(connect)
        cursor.execute.side_effect = ServerOperationError("Table not found")

        data, error = Databricks(CONFIGURATION).run_query("SELECT * FROM missing", None)

        self.assertIsNone(data)
        self.assertEqual(error, "Table not found")

    def test_get_database_tables_with_columns(self, connect):
        cursor = _mock_connection(connect)
        cursor.tables.return_value.fetchall.return_value = [
            TableRow("main", "default", "empty", "TABLE"),
            TableRow("main", "default", "users", "TABLE"),
        ]
        cursor.columns.return_value.fetchall.return_value = [
            ColumnRow("main", "default", "users", "id", -5, "BIGINT"),
            ColumnRow("main", "default", "users", "name", 12, "STRING"),
        ]

        schema = Databricks(CONFIGURATION).get_database_tables_with_columns("default")

        cursor.tables.assert_called_once_with(schema_name="default")
        cursor.columns.assert_called_once_with(schema_name="default")
        self.assertEqual(
            schema,
            [
                {"name": "default.empty", "columns": []},
                {
                    "name": "default.users",
                    "columns": [{"name": "id", "type": "BIGINT"}, {"name": "name", "type": "STRING"}],
                },
            ],
        )

    def test_get_table_columns(self, connect):
        cursor = _mock_connection(connect)
        cursor.columns.return_value.fetchall.return_value = [
            ColumnRow("main", "default", "users", "id", -5, "BIGINT"),
        ]

        columns = Databricks(CONFIGURATION).get_table_columns("default", "users")

        cursor.columns.assert_called_once_with(schema_name="default", table_name="users")
        self.assertEqual(columns, [{"name": "id", "type": "BIGINT"}])


class TestNormalizeHost(TestCase):
    def test_strips_scheme_and_trailing_slash(self):
        self.assertEqual(_normalize_host(" https://dbc-1.cloud.databricks.com/ "), "dbc-1.cloud.databricks.com")
        self.assertEqual(_normalize_host("dbc-1.cloud.databricks.com"), "dbc-1.cloud.databricks.com")


class TestDatabricksQueryAnnotation(TestCase):
    def test_annotate_query_with_use_query_annotation_option(self):
        query_runner = Databricks({"useQueryAnnotation": True})

        self.assertTrue(query_runner.should_annotate_query)

        metadata = {
            "user_id": 42,
            "query_id": "adhoc",
            "Job ID": "12345678-1234-1234-1234-123456789abc",
            "Query Hash": "0123456789abcdef0123456789abcdef",
            "Scheduled": False,
        }

        query = "SELECT a FROM tbl"
        expect = (
            "/* user_id: 42, query_id: adhoc, "
            "Query Hash: 0123456789abcdef0123456789abcdef, "
            "Scheduled: False */ SELECT a FROM tbl"
        )

        self.assertEqual(query_runner.annotate_query(query, metadata), expect)

    def test_annotate_query_without_use_query_annotation_option(self):
        query_runner = Databricks({})

        self.assertFalse(query_runner.should_annotate_query)

        metadata = {
            "user_id": 42,
            "query_id": "adhoc",
            "Job ID": "12345678-1234-1234-1234-123456789abc",
            "Query Hash": "0123456789abcdef0123456789abcdef",
            "Scheduled": False,
        }

        query = "SELECT a FROM tbl"

        self.assertEqual(query_runner.annotate_query(query, metadata), query)


class TestSplitMultipleSQLStatements(TestCase):
    def _assertSplitSql(self, sql, expected_stmt):
        stmt = split_sql_statements(sql)
        # ignore leading and trailing whitespaces when comparing
        self.assertListEqual([s.strip() for s in stmt], [s.strip() for s in expected_stmt])

    # - it should split statements by semicolon
    # - it should keep semicolon in string literals
    # - it should keep semicolon in quoted names (tables, columns, aliases)
    # - it should keep semicolon in comments
    # - it should remove semicolon after the statement
    def test_splits_multiple_statements_by_semicolon(self):
        self._assertSplitSql(
            """
select 1 as "column", 'a;b;c' as "column ; 2"
from "table;";
select 2 as column, if(true, x, "y;z") from table2 as "alias ; 2";
select 3 -- comment with ; semicolon
from table3
            """,
            [
                """
select 1 as "column", 'a;b;c' as "column ; 2"
from "table;"
                """,
                """
select 2 as column, if(true, x, "y;z") from table2 as "alias ; 2"
                """,
                """
select 3 -- comment with ; semicolon
from table3
                """,
            ],
        )

    # - it should keep whitespaces
    # - it should keep letter case
    # - it should keep all unknown characters/symbols/etc.
    def test_keeps_original_syntax(self):
        self._assertSplitSql(
            """
selECT   #TesT#;
INSERT LoReM
    IPSUM %^&*()
            """,
            [
                """
selECT   #TesT#
                """,
                """
INSERT LoReM
    IPSUM %^&*()
                """,
            ],
        )

        self._assertSplitSql(
            """
set test_var = 'hello';
select ${test_var}, 123 from table;
select 'qwerty' from ${test_var};
select now()
            """,
            [
                "set test_var = 'hello'",
                "select ${test_var}, 123 from table",
                "select 'qwerty' from ${test_var}",
                "select now()",
            ],
        )

    # - it should keep all comments to semicolon after statement
    # - it should remove comments after semicolon after statement
    def test_keeps_comments(self):
        self._assertSplitSql(
            """
-- comment 1
SELECT x -- comment 2
-- comment 3
; -- comment 4

-- comment 5
DELETE FROM table -- comment 6
            """,
            [
                """
-- comment 1
SELECT x -- comment 2
-- comment 3
                """,
                """
-- comment 5
DELETE FROM table
                """,
            ],
        )

    # - it should skip empty statements
    # - it should skip comment-only statements
    def test_skips_empty_statements(self):
        self._assertSplitSql(
            """
;
-- comment 1
;
SELECT * FROM table;
-- comment 2
;
            """,
            [
                """
SELECT * FROM table
                """
            ],
        )

        # special case - if all statements were empty it should return the only empty statement
        self._assertSplitSql(";; -- comment 1", [""])
