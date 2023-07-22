import unittest

from redash.query_runner.oracle import Oracle


class TestOracle(unittest.TestCase):
    def setUp(self):
        self.query_runner = Oracle({})

    def test_add_limit_query_no_limit(self):
        query = "SELECT *"
        self.assertEqual("SELECT * FETCH NEXT 1000 ROWS ONLY", self.query_runner.add_limit_to_query(query))

    def test_add_limit_query_with_punc(self):
        query = "SELECT *;"
        self.assertEqual("SELECT * FETCH NEXT 1000 ROWS ONLY;", self.query_runner.add_limit_to_query(query))

    def test_apply_auto_limit_origin_no_limit_1(self):
        origin_query_text = "SELECT 2"
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual("SELECT 2 FETCH NEXT 1000 ROWS ONLY", query_text)

    def test_apply_auto_limit_origin_have_limit_1(self):
        origin_query_text = "SELECT 2 LIMIT 100 FETCH NEXT 1000 ROWS ONLY"
        query_text = self.query_runner.apply_auto_limit(origin_query_text, True)
        self.assertEqual(origin_query_text, query_text)


if __name__ == "__main__":
    unittest.main()
