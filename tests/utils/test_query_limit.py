import unittest

from redash.utils import query_is_select_no_limit, add_limit_to_query


class TestQueryLimit(unittest.TestCase):
    def test_check_query_limit_no_limit(self):
        query = "SELECT *"
        self.assertEqual(True, query_is_select_no_limit(query))

    def test_check_query_limit_non_select(self):
        query = "Create Table (PersonID INT)"
        self.assertEqual(False, query_is_select_no_limit(query))

    def test_check_query_limit_invalid_1(self):
        query = "OFFSET 5"
        self.assertEqual(False, query_is_select_no_limit(query))

    def test_check_query_limit_invalid_2(self):
        query = "TABLE A FROM TABLE B"
        self.assertEqual(False, query_is_select_no_limit(query))

    def test_check_query_with_limit(self):
        query = "SELECT * LIMIT 5"
        self.assertEqual(False, query_is_select_no_limit(query))

    def test_check_query_with_offset(self):
        query = "SELECT * LIMIT 5 OFFSET 3"
        self.assertEqual(False, query_is_select_no_limit(query))

    def test_add_limit_query_no_limit(self):
        query = "SELECT *"
        self.assertEqual("SELECT * LIMIT 1000", add_limit_to_query(query))

    def test_add_limit_query_with_punc(self):
        query = "SELECT *;"
        self.assertEqual("SELECT * LIMIT 1000;", add_limit_to_query(query))


if __name__ == '__main__':
    unittest.main()
