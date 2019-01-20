from unittest import TestCase
import pytest

from redash.utils.parameterized_query import ParameterizedQuery, InvalidParameterError


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

    def test_raises_on_invalid_text_parameters(self):
        schema = [{"name": "bar", "type": "text"}]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": 7})

    def test_validates_text_parameters(self):
        schema = [{"name": "bar", "type": "text"}]
        query = ParameterizedQuery("foo {{bar}}", schema)

        query.apply({"bar": u"baz"})

        self.assertEquals("foo baz", query.text)

    def test_raises_on_invalid_number_parameters(self):
        schema = [{"name": "bar", "type": "number"}]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": "baz"})

    def test_validates_number_parameters(self):
        schema = [{"name": "bar", "type": "number"}]
        query = ParameterizedQuery("foo {{bar}}", schema)

        query.apply({"bar": 7})

        self.assertEquals("foo 7", query.text)
