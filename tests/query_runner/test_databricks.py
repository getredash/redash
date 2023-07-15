from unittest import TestCase

from redash.query_runner import split_sql_statements


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
