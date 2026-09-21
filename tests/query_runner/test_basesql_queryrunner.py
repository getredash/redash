import unittest
from unittest.mock import patch

import sqlparse
from sqlparse.engine import grouping
from sqlparse.exceptions import SQLParseError

from redash import configure_sqlparse, settings
from redash.query_runner import BaseQueryRunner, BaseSQLQueryRunner
from redash.utils import gen_query_hash


class TestBaseSQLQueryRunner(unittest.TestCase):
    def setUp(self):
        self.query_runner = BaseSQLQueryRunner({})

    def test_check_query_limit_no_limit(self):
        query = "SELECT *"
        self.assertEqual(True, self.query_runner.query_is_select_no_limit(query))

    def test_check_query_limit_non_select(self):
        query = "Create Table (PersonID INT)"
        self.assertEqual(False, self.query_runner.query_is_select_no_limit(query))

    def test_check_query_limit_invalid_1(self):
        query = "OFFSET 5"
        self.assertEqual(False, self.query_runner.query_is_select_no_limit(query))

    def test_check_query_limit_invalid_2(self):
        query = "TABLE A FROM TABLE B"
        self.assertEqual(False, self.query_runner.query_is_select_no_limit(query))

    def test_check_query_with_limit(self):
        query = "SELECT * LIMIT 5"
        self.assertEqual(False, self.query_runner.query_is_select_no_limit(query))

    def test_check_query_with_offset(self):
        query = "SELECT * LIMIT 5 OFFSET 3"
        self.assertEqual(False, self.query_runner.query_is_select_no_limit(query))

    def test_add_limit_query_no_limit(self):
        query = "SELECT *"
        self.assertEqual("SELECT * LIMIT 1000", self.query_runner.add_limit_to_query(query))

    def test_add_limit_query_with_punc(self):
        query = "SELECT *;"
        self.assertEqual("SELECT * LIMIT 1000;", self.query_runner.add_limit_to_query(query))

    def test_apply_auto_limit_origin_no_limit_1(self):
        origin_query_text = "SELECT 2"
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual("SELECT 2 LIMIT 1000", query_text)

    def test_apply_auto_limit_origin_have_limit_1(self):
        origin_query_text = "SELECT 2 LIMIT 100"
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual(origin_query_text, query_text)

    def test_apply_auto_limit_origin_have_limit_2(self):
        origin_query_text = "SELECT * FROM fake WHERE id IN (SELECT id FROM fake_2 LIMIT 200) LIMIT 200"
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual(origin_query_text, query_text)

    def test_apply_auto_limit_origin_no_limit_2(self):
        origin_query_text = "SELECT * FROM fake WHERE id IN (SELECT id FROM fake_2 LIMIT 200)"
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual(origin_query_text + " LIMIT 1000", query_text)

    def test_apply_auto_limit_non_select_query(self):
        origin_query_text = (
            "create table execution_times as "
            "(select id, retrieved_at, data_source_id, query, runtime, query_hash "
            "from query_results order by 1 desc)"
        )
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual(origin_query_text, query_text)

    def test_apply_auto_limit_error_query(self):
        origin_query_text = "dklsk jdhsajhdiwc kkdsakjdwi mdklsjal"
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual(origin_query_text, query_text)

    def test_apply_auto_limit_multi_query_add_limit_1(self):
        origin_query_text = (
            "insert into execution_times (id, retrieved_at, data_source_id, query, runtime, query_hash) "
            "select id, retrieved_at, data_source_id, query, runtime, query_hash from query_results "
            "where id > (select max(id) from execution_times);\n"
            "select max(id), 'execution_times' as table_name from execution_times "
            "union all "
            "select max(id), 'query_results' as table_name from query_results"
        )
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual(origin_query_text + " LIMIT 1000", query_text)

    def test_apply_auto_limit_multi_query_add_limit_2(self):
        origin_query_text = "use database demo;\n" "select * from data"
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual(origin_query_text + " LIMIT 1000", query_text)

    def test_apply_auto_limit_multi_query_end_with_punc(self):
        origin_query_text = "select * from table1;\n" "select * from table2"
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual("select * from table1;\nselect * from table2 LIMIT 1000", query_text)

    def test_apply_auto_limit_multi_query_last_not_select(self):
        origin_query_text = "select * from table1;\n" "CREATE TABLE Persons (PersonID int)"
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual(origin_query_text, query_text)

    def test_apply_auto_limit_last_command_comment(self):
        origin_query_text = "select * from raw_events; # comment"
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual("select * from raw_events LIMIT 1000", query_text)

    def test_apply_auto_limit_last_command_comment_2(self):
        origin_query_text = "select * from raw_events; -- comment"
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual("select * from raw_events LIMIT 1000", query_text)

    def test_apply_auto_limit_inline_comment(self):
        origin_query_text = "select * from raw_events -- comment"
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual("select * from raw_events LIMIT 1000", query_text)

    def test_apply_auto_limit_statement_too_large_to_group(self):
        # sqlparse raises SQLParseError past its grouping limits. Run the query as the
        # user wrote it rather than failing it.
        origin_query_text = "select * from events where id in ({})".format(",".join(str(i) for i in range(10000)))
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual(origin_query_text, query_text)

    def test_apply_auto_limit_statement_too_deeply_nested(self):
        origin_query_text = "select {}1{}".format("(" * 200, ")" * 200)
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual(origin_query_text, query_text)

    def test_gen_query_hash_baseSQL(self):
        origin_query_text = "select *"
        expected_query_text = "select * LIMIT 1000"
        base_runner = BaseQueryRunner({})
        self.assertEqual(
            base_runner.gen_query_hash(expected_query_text), self.query_runner.gen_query_hash(origin_query_text, True)
        )

    def test_gen_query_hash_NoneSQL(self):
        origin_query_text = "select *"
        base_runner = BaseQueryRunner({})
        self.assertEqual(gen_query_hash(origin_query_text), base_runner.gen_query_hash(origin_query_text, True))


class TestSqlparseGroupingLimits(unittest.TestCase):
    """configure_sqlparse() reaches into sqlparse.engine.grouping, so fail loudly here
    rather than silently losing the limits if sqlparse renames those attributes."""

    def setUp(self):
        self.original = (grouping.MAX_GROUPING_TOKENS, grouping.MAX_GROUPING_DEPTH)

    def tearDown(self):
        grouping.MAX_GROUPING_TOKENS, grouping.MAX_GROUPING_DEPTH = self.original
        configure_sqlparse()

    def test_settings_are_applied(self):
        with patch.multiple(settings, SQLPARSE_MAX_GROUPING_TOKENS=1234, SQLPARSE_MAX_GROUPING_DEPTH=56):
            configure_sqlparse()
            self.assertEqual(1234, grouping.MAX_GROUPING_TOKENS)
            self.assertEqual(56, grouping.MAX_GROUPING_DEPTH)

    def test_zero_disables_the_limit(self):
        with patch.multiple(settings, SQLPARSE_MAX_GROUPING_TOKENS=0, SQLPARSE_MAX_GROUPING_DEPTH=0):
            configure_sqlparse()
            self.assertIsNone(grouping.MAX_GROUPING_TOKENS)
            self.assertIsNone(grouping.MAX_GROUPING_DEPTH)

    def test_limit_raises_sqlparse_error(self):
        with patch.multiple(settings, SQLPARSE_MAX_GROUPING_TOKENS=100, SQLPARSE_MAX_GROUPING_DEPTH=100):
            configure_sqlparse()
            with self.assertRaises(SQLParseError):
                sqlparse.parse("select * from events where id in ({})".format(",".join(str(i) for i in range(100))))


if __name__ == "__main__":
    unittest.main()
