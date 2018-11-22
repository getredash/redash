from redash.utils.sql_query import SQLQuery
from unittest import TestCase


class TestSQLQuery(TestCase):
    def test_serializes(self):
        query = SQLQuery("SELECT * FROM users WHERE userid='{{userid}}'").apply({
            "userid": 22
            })

        self.assertEqual(query.text(), "SELECT * FROM users WHERE userid='22'")

    def test_marks_simple_queries_with_where_params_as_safe(self):
        query = SQLQuery("SELECT * FROM users WHERE userid='{{userid}}'").apply({
            "userid": 22
            })

        self.assertTrue(query.is_safe())

    def test_marks_simple_queries_with_column_params_as_safe(self):
        query = SQLQuery("SELECT {{this_column}} FROM users").apply({
            "this_column": "username"
            })

        self.assertTrue(query.is_safe())

    def test_marks_multiple_simple_queries_as_safe(self):
        query = SQLQuery("SELECT * FROM users WHERE userid='{{userid}}' ; SELECT * FROM profiles").apply({
            "userid": 22
            })

        self.assertTrue(query.is_safe())

    def test_marks_tautologies_as_not_safe(self):
        query = SQLQuery("SELECT * FROM users WHERE userid={{userid}}").apply({
            "userid": "22 OR 1==1"
            })

        self.assertFalse(query.is_safe())

    def test_marks_union_queries_as_not_safe(self):
        query = SQLQuery("SELECT * FROM users WHERE userid={{userid}}").apply({
            "userid": "22 UNION SELECT body, results, 1 FROM reports"
            })

        self.assertFalse(query.is_safe())

    def test_marks_comment_attacks_as_not_safe(self):
        query = SQLQuery("SELECT * FROM users WHERE username='{{username}}' AND password='{{password}}'").apply({
            "username": "admin' --"
            })

        self.assertFalse(query.is_safe())

    def test_marks_additional_columns_as_not_safe(self):
        query = SQLQuery("SELECT {{this_column}} FROM users").apply({
            "this_column": "username, password"
            })

        self.assertFalse(query.is_safe())

    def test_marks_query_additions_as_not_safe(self):
        query = SQLQuery("SELECT * FROM users ORDER BY {{this_column}}").apply({
            "this_column": "id ; DROP TABLE midgets"
            })

        self.assertFalse(query.is_safe())
