from unittest import TestCase

from redash.utils.parameterized_query import ParameterizedQuery


class TestParameterizedQuery(TestCase):
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
