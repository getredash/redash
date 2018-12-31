from unittest import TestCase

from redash.utils.parameterized_query import SQLInjectionError, ParameterizedSqlQuery, ParameterizedQuery


class TestSQLQuery(TestCase):
    def test_serializes(self):
        query = ParameterizedSqlQuery("SELECT * FROM users WHERE userid='{{userid}}'").apply({
            "userid": 22
            })

        self.assertEqual(query.text, "SELECT * FROM users WHERE userid='22'")

    def test_raises_when_serializing_unsafe_queries(self):
        query = ParameterizedSqlQuery("SELECT * FROM users WHERE userid={{userid}}").apply({
            "userid": "22 OR 1==1"
            })

        self.assertRaises(SQLInjectionError, getattr, query, 'text')

    def test_marks_queries_without_params_as_safe(self):
        query = ParameterizedSqlQuery("SELECT * FROM users")

        self.assertTrue(query.is_safe())

    def test_marks_simple_queries_with_where_params_as_safe(self):
        query = ParameterizedSqlQuery("SELECT * FROM users WHERE userid='{{userid}}'").apply({
            "userid": 22
            })

        self.assertTrue(query.is_safe())

    def test_marks_simple_queries_with_column_params_as_safe(self):
        query = ParameterizedSqlQuery("SELECT {{this_column}} FROM users").apply({
            "this_column": "username"
            })

        self.assertTrue(query.is_safe())

    def test_marks_multiple_simple_queries_as_safe(self):
        query = ParameterizedSqlQuery("SELECT * FROM users WHERE userid='{{userid}}' ; SELECT * FROM profiles").apply({
            "userid": 22
            })

        self.assertTrue(query.is_safe())

    def test_marks_tautologies_as_not_safe(self):
        query = ParameterizedSqlQuery("SELECT * FROM users WHERE userid={{userid}}").apply({
            "userid": "22 OR 1==1"
            })

        self.assertFalse(query.is_safe())

    def test_marks_union_queries_as_not_safe(self):
        query = ParameterizedSqlQuery("SELECT * FROM users WHERE userid={{userid}}").apply({
            "userid": "22 UNION SELECT body, results, 1 FROM reports"
            })

        self.assertFalse(query.is_safe())

    def test_marks_comment_attacks_as_not_safe(self):
        query = ParameterizedSqlQuery("SELECT * FROM users WHERE username='{{username}}' AND password='{{password}}'").apply({
            "username": "admin' --"
            })

        self.assertFalse(query.is_safe())

    def test_marks_additional_columns_as_not_safe(self):
        query = ParameterizedSqlQuery("SELECT {{this_column}} FROM users").apply({
            "this_column": "username, password"
            })

        self.assertFalse(query.is_safe())

    def test_marks_query_additions_as_not_safe(self):
        query = ParameterizedSqlQuery("SELECT * FROM users ORDER BY {{this_column}}").apply({
            "this_column": "id ; DROP TABLE midgets"
            })

        self.assertFalse(query.is_safe())

    def test_marks_multiple_word_params_as_safe(self):
        query = ParameterizedSqlQuery("SELECT {{why would you do this}} FROM users").apply({
            "why would you do this": "shrug"
            })

        self.assertTrue(query.is_safe())

    def test_marks_param_negations_as_safe(self):
        query = ParameterizedSqlQuery("SELECT date_add(some_column, INTERVAL -{{days}} DAY) FROM events").apply({
            "days": 7
            })

        self.assertTrue(query.is_safe())

    def test_returns_empty_list_for_regular_query(self):
        query = ParameterizedQuery(u"SELECT 1")
        self.assertEqual(set([]), query.missing_params)

    def test_finds_all_params_when_missing(self):
        query = ParameterizedQuery(u"SELECT {{param}} FROM {{table}}")
        self.assertEqual(set(['param', 'table']), query.missing_params)

    def test_finds_all_params(self):
        query = ParameterizedQuery(u"SELECT {{param}} FROM {{table}}").apply({
            'param': 'value',
            'table': 'value'
            })
        self.assertEqual(set([]), query.missing_params)

    def test_deduplicates_params(self):
        query = ParameterizedQuery(u"SELECT {{param}}, {{param}} FROM {{table}}").apply({
            'param': 'value',
            'table': 'value'
            })
        self.assertEqual(set([]), query.missing_params)

    def test_handles_nested_params(self):
        query = ParameterizedQuery(u"SELECT {{param}}, {{param}} FROM {{table}} -- {{#test}} {{nested_param}} {{/test}}").apply({
            'param': 'value',
            'table': 'value'
            })
        self.assertEqual(set(['test', 'nested_param']), query.missing_params)

    def test_handles_objects(self):
        query = ParameterizedQuery(u"SELECT * FROM USERS WHERE created_at between '{{ created_at.start }}' and '{{ created_at.end }}'").apply({
            'created_at': {
                'start': 1,
                'end': 2
                }
            })
        self.assertEqual(set([]), query.missing_params)
