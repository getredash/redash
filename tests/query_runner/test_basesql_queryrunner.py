import unittest

from redash.query_runner import BaseSQLQueryRunner, BaseQueryRunner


class TestBaseSQLQueryRunner(unittest.TestCase):

    def setUp(self):
        self.query_runner = BaseSQLQueryRunner(BaseQueryRunner)

    def test_apply_auto_limit_origin_no_limit_1(self):
        origin_query_text = "SELECT 2"
        query_text = self.query_runner.apply_auto_limit(origin_query_text)
        self.assertEqual("SELECT 2 LIMIT 1000", query_text)

    def test_apply_auto_limit_origin_have_limit_1(self):
        origin_query_text = "SELECT 2 LIMIT 100"
        query_text = self.query_runner.apply_auto_limit(origin_query_text)
        self.assertEqual(origin_query_text, query_text)

    def test_apply_auto_limit_origin_have_limit_2(self):
        origin_query_text = "SELECT * FROM fake WHERE id IN (SELECT id FROM fake_2 LIMIT 200) LIMIT 200"
        query_text = self.query_runner.apply_auto_limit(origin_query_text)
        self.assertEqual(origin_query_text, query_text)

    def test_apply_auto_limit_origin_no_limit_2(self):
        origin_query_text = "SELECT * FROM fake WHERE id IN (SELECT id FROM fake_2 LIMIT 200)"
        query_text = self.query_runner.apply_auto_limit(origin_query_text)
        self.assertEqual(origin_query_text + " LIMIT 1000", query_text)

    def test_apply_auto_limit_non_select_query(self):
        origin_query_text = ("create table execution_times as "
                             "(select id, retrieved_at, data_source_id, query, runtime, query_hash "
                             "from query_results order by 1 desc)")
        query_text = self.query_runner.apply_auto_limit(origin_query_text)
        self.assertEqual(origin_query_text, query_text)

    def test_apply_auto_limit_error_query(self):
        origin_query_text = "dklsk jdhsajhdiwc kkdsakjdwi mdklsjal"
        query_text = self.query_runner.apply_auto_limit(origin_query_text)
        self.assertEqual(origin_query_text, query_text)

    def test_apply_auto_limit_multi_query_add_limit_1(self):
        origin_query_text = ("insert into execution_times (id, retrieved_at, data_source_id, query, runtime, query_hash) "
                            "select id, retrieved_at, data_source_id, query, runtime, query_hash from query_results "
                            "where id > (select max(id) from execution_times);\n"
                            "select max(id), 'execution_times' as table_name from execution_times "
                            "union all "
                            "select max(id), 'query_results' as table_name from query_results")
        query_text = self.query_runner.apply_auto_limit(origin_query_text)
        self.assertEqual(origin_query_text + " LIMIT 1000", query_text)

    def test_apply_auto_limit_multi_query_add_limit_2(self):
        origin_query_text = "use database demo;\n" \
                            "select * from data"
        query_text = self.query_runner.apply_auto_limit(origin_query_text)
        self.assertEqual(origin_query_text + " LIMIT 1000", query_text)

    def test_apply_auto_limit_multi_query_end_with_punc(self):
        origin_query_text = ("select * from table1;\n"
                             "select * from table2")
        query_text = self.query_runner.apply_auto_limit(origin_query_text)
        self.assertEqual("select * from table1;\nselect * from table2 LIMIT 1000", query_text)

    def test_apply_auto_limit_multi_query_last_not_select(self):
        origin_query_text = ("select * from table1;\n"
                             "CREATE TABLE Persons (PersonID int)")
        query_text = self.query_runner.apply_auto_limit(origin_query_text)
        self.assertEqual(origin_query_text, query_text)

    def test_apply_auto_limit_last_command_comment(self):
        origin_query_text = "select * from raw_events; # comment"
        query_text = self.query_runner.apply_auto_limit(origin_query_text)
        self.assertEqual("select * from raw_events LIMIT 1000", query_text)

    def test_apply_auto_limit_last_command_comment_2(self):
        origin_query_text = "select * from raw_events; -- comment"
        query_text = self.query_runner.apply_auto_limit(origin_query_text)
        self.assertEqual("select * from raw_events LIMIT 1000", query_text)

    def test_apply_auto_limit_inline_comment(self):
        origin_query_text = "select * from raw_events -- comment"
        query_text = self.query_runner.apply_auto_limit(origin_query_text)
        self.assertEqual("select * from raw_events LIMIT 1000", query_text)


if __name__ == '__main__':
    unittest.main()
