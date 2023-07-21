from collections import namedtuple
from unittest import TestCase

import pytest
from mock import patch

from redash.models.parameterized_query import (
    InvalidParameterError, ParameterizedQuery,
    QueryDetachedFromDataSourceError, dropdown_values)


class TestParameterizedQuery(TestCase):
    def test_returns_empty_list_for_regular_query(self):
        query = ParameterizedQuery("SELECT 1")
        self.assertEqual(set([]), query.missing_params)

    def test_finds_all_params_when_missing(self):
        query = ParameterizedQuery("SELECT {{param}} FROM {{table}}")
        self.assertEqual(set(["param", "table"]), query.missing_params)

    def test_finds_all_params(self):
        query = ParameterizedQuery("SELECT {{param}} FROM {{table}}").apply(
            {"param": "value", "table": "value"}
        )
        self.assertEqual(set([]), query.missing_params)

    def test_deduplicates_params(self):
        query = ParameterizedQuery("SELECT {{param}}, {{param}} FROM {{table}}").apply(
            {"param": "value", "table": "value"}
        )
        self.assertEqual(set([]), query.missing_params)

    def test_handles_nested_params(self):
        query = ParameterizedQuery(
            "SELECT {{param}}, {{param}} FROM {{table}} -- {{#test}} {{nested_param}} {{/test}}"
        ).apply({"param": "value", "table": "value"})
        self.assertEqual(set(["test", "nested_param"]), query.missing_params)

    def test_handles_objects(self):
        query = ParameterizedQuery(
            "SELECT * FROM USERS WHERE created_at between '{{ created_at.start }}' and '{{ created_at.end }}'"
        ).apply({"created_at": {"start": 1, "end": 2}})
        self.assertEqual(set([]), query.missing_params)

    def test_single_invalid_parameter_exception(self):
        query = ParameterizedQuery("foo")
        with pytest.raises(InvalidParameterError) as excinfo:
            query.apply({"bar": None})

        message, parameter_errors = excinfo.value.args
        self.assertEquals(message, 'Parameter "bar" is invalid.')
        self.assertEquals(len(parameter_errors), 1)

    def test_multiple_invalid_parameter_exception(self):
        query = ParameterizedQuery("foo")
        with pytest.raises(InvalidParameterError) as excinfo:
            query.apply({"bar": None, "baz": None})

        message, parameter_errors = excinfo.value.args
        self.assertEquals(message, 'Parameters "bar", "baz" are invalid.')
        self.assertEquals(len(parameter_errors), 2)

    def test_invalid_parameter_error_messages(self):
        schema = [
            {"name": "bar", "type": "text"},
            {"name": "baz", "type": "text"},
            {"name": "foo", "type": "text"},
            {"name": "spam", "type": "date-range"},
            {"name": "ham", "type": "date-range"},
            {"name": "eggs", "type": "number"},
        ]
        parameters = {
            "bar": None,
            "baz": 7,
            "foo": "text",
            "spam": {"start": "2000-01-01 12:00:00", "end": "2000-12-31 12:00:00"},
            "ham": {"start": "2000-01-01 12:00:00", "end": "2000-12-31 12:00:00"},
            "eggs": 42,
        }
        query = ParameterizedQuery(
            "foo {{ spam }} {{ ham.start}} {{ eggs.start }}", schema
        )
        with pytest.raises(InvalidParameterError) as excinfo:
            query.apply(parameters)

        _, parameter_errors = excinfo.value.args
        self.assertEquals(
            parameter_errors,
            {
                "bar": "Required parameter",
                "baz": "Invalid value",
                "foo": "{{ foo }} not found in query",
                "spam": "{{ spam.start }} not found in query",
                "ham": "{{ ham.end }} not found in query",
                "eggs": "{{ eggs }} not found in query",
            },
        )

    def test_single_missing_parameter_error(self):
        query = ParameterizedQuery("foo {{ bar }}")

        message, parameter_errors = query.missing_params_error
        self.assertEquals(message, 'Parameter "bar" is missing.')
        self.assertEquals(len(parameter_errors), 1)

    def test_multiple_missing_parameter_error(self):
        query = ParameterizedQuery("foo {{ bar }} {{ baz }}")

        message, parameter_errors = query.missing_params_error
        self.assertEquals(message, 'Parameters "bar", "baz" are missing.')
        self.assertEquals(len(parameter_errors), 2)

    def test_missing_parameter_error_message(self):
        query = ParameterizedQuery("foo {{ bar }}")

        _, parameter_errors = query.missing_params_error
        self.assertEquals(parameter_errors, {"bar": "Missing parameter"})

    def test_ignores_parameters_not_in_schema(self):
        schema = [{"name": "bar", "type": "text"}]
        query = ParameterizedQuery("foo {{ bar }}", schema)

        with pytest.raises(InvalidParameterError) as excinfo:
            query.apply({"qux": 7, "bar": 7})

        _, parameter_errors = excinfo.value.args
        self.assertTrue("bar" in parameter_errors)
        self.assertFalse("qux" in parameter_errors)

    def test_passes_on_parameters_not_in_schema(self):
        schema = [{"name": "bar", "type": "text"}]
        query = ParameterizedQuery("foo", schema)

        try:
            query.apply({"qux": None})
        except InvalidParameterError:
            pytest.fail("Unexpected InvalidParameterError")

    def test_raises_on_invalid_text_parameters(self):
        schema = [{"name": "bar", "type": "text"}]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": 7})

    def test_validates_text_parameters(self):
        schema = [{"name": "bar", "type": "text"}]
        query = ParameterizedQuery("foo {{bar}}", schema)

        query.apply({"bar": "baz"})

        self.assertEqual("foo baz", query.text)

    def test_raises_on_invalid_number_parameters(self):
        schema = [{"name": "bar", "type": "number"}]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": "baz"})

    def test_validates_number_parameters(self):
        schema = [{"name": "bar", "type": "number"}]
        query = ParameterizedQuery("foo {{bar}}", schema)

        query.apply({"bar": 7})

        self.assertEqual("foo 7", query.text)

    def test_coerces_number_parameters(self):
        schema = [{"name": "bar", "type": "number"}]
        query = ParameterizedQuery("foo {{bar}}", schema)

        query.apply({"bar": "3.14"})

        self.assertEqual("foo 3.14", query.text)

    def test_raises_on_invalid_date_parameters(self):
        schema = [{"name": "bar", "type": "date"}]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": "baz"})

    def test_raises_on_none_for_date_parameters(self):
        schema = [{"name": "bar", "type": "date"}]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": None})

    def test_validates_date_parameters(self):
        schema = [{"name": "bar", "type": "date"}]
        query = ParameterizedQuery("foo {{bar}}", schema)

        query.apply({"bar": "2000-01-01 12:00:00"})

        self.assertEqual("foo 2000-01-01 12:00:00", query.text)

    def test_raises_on_invalid_enum_parameters(self):
        schema = [{"name": "bar", "type": "enum", "enumOptions": ["baz", "qux"]}]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": 7})

    def test_raises_on_unlisted_enum_value_parameters(self):
        schema = [{"name": "bar", "type": "enum", "enumOptions": ["baz", "qux"]}]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": "shlomo"})

    def test_raises_on_unlisted_enum_list_value_parameters(self):
        schema = [
            {
                "name": "bar",
                "type": "enum",
                "enumOptions": ["baz", "qux"],
                "multiValuesOptions": {"separator": ",", "prefix": "", "suffix": ""},
            }
        ]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": ["shlomo", "baz"]})

    def test_validates_enum_parameters(self):
        schema = [{"name": "bar", "type": "enum", "enumOptions": ["baz", "qux"]}]
        query = ParameterizedQuery("foo {{bar}}", schema)

        query.apply({"bar": "baz"})

        self.assertEqual("foo baz", query.text)

    def test_validates_enum_list_value_parameters(self):
        schema = [
            {
                "name": "bar",
                "type": "enum",
                "enumOptions": ["baz", "qux"],
                "multiValuesOptions": {"separator": ",", "prefix": "'", "suffix": "'"},
            }
        ]
        query = ParameterizedQuery("foo {{bar}}", schema)

        query.apply({"bar": ["qux", "baz"]})

        self.assertEqual("foo 'qux','baz'", query.text)

    @patch(
        "redash.models.parameterized_query.dropdown_values",
        return_value=[{"value": "1"}],
    )
    def test_validation_accepts_integer_values_for_dropdowns(self, _):
        schema = [{"name": "bar", "type": "query", "queryId": 1}]
        query = ParameterizedQuery("foo {{bar}}", schema)

        query.apply({"bar": 1})

        self.assertEqual("foo 1", query.text)

    @patch("redash.models.parameterized_query.dropdown_values")
    def test_raises_on_invalid_query_parameters(self, _):
        schema = [{"name": "bar", "type": "query", "queryId": 1}]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": 7})

    @patch(
        "redash.models.parameterized_query.dropdown_values",
        return_value=[{"value": "baz"}],
    )
    def test_raises_on_unlisted_query_value_parameters(self, _):
        schema = [{"name": "bar", "type": "query", "queryId": 1}]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": "shlomo"})

    @patch(
        "redash.models.parameterized_query.dropdown_values",
        return_value=[{"value": "baz"}],
    )
    def test_validates_query_parameters(self, _):
        schema = [{"name": "bar", "type": "query", "queryId": 1}]
        query = ParameterizedQuery("foo {{bar}}", schema)

        query.apply({"bar": "baz"})

        self.assertEqual("foo baz", query.text)

    def test_raises_on_invalid_date_range_parameters(self):
        schema = [{"name": "bar", "type": "date-range"}]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": "baz"})

    def test_validates_date_range_parameters(self):
        schema = [{"name": "bar", "type": "date-range"}]
        query = ParameterizedQuery("foo {{bar.start}} {{bar.end}}", schema)

        query.apply(
            {"bar": {"start": "2000-01-01 12:00:00", "end": "2000-12-31 12:00:00"}}
        )

        self.assertEqual("foo 2000-01-01 12:00:00 2000-12-31 12:00:00", query.text)

    def test_raises_on_unexpected_param_types(self):
        schema = [{"name": "bar", "type": "burrito"}]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": "baz"})

    def test_is_not_safe_if_expecting_text_parameter(self):
        schema = [{"name": "bar", "type": "text"}]
        query = ParameterizedQuery("foo", schema)

        self.assertFalse(query.is_safe)

    def test_is_safe_if_not_expecting_text_parameter(self):
        schema = [{"name": "bar", "type": "number"}]
        query = ParameterizedQuery("foo", schema)

        self.assertTrue(query.is_safe)

    def test_is_safe_if_not_expecting_any_parameters(self):
        schema = []
        query = ParameterizedQuery("foo", schema)

        self.assertTrue(query.is_safe)

    @patch(
        "redash.models.parameterized_query._load_result",
        return_value={
            "columns": [{"name": "id"}, {"name": "Name"}, {"name": "Value"}],
            "rows": [{"id": 5, "Name": "John", "Value": "John Doe"}],
        },
    )
    def test_dropdown_values_prefers_name_and_value_columns(self, _):
        values = dropdown_values(1, None)
        self.assertEqual(values, [{"name": "John", "value": "John Doe"}])

    @patch(
        "redash.models.parameterized_query._load_result",
        return_value={
            "columns": [{"name": "id"}, {"name": "fish"}, {"name": "poultry"}],
            "rows": [{"fish": "Clown", "id": 5, "poultry": "Hen"}],
        },
    )
    def test_dropdown_values_compromises_for_first_column(self, _):
        values = dropdown_values(1, None)
        self.assertEqual(values, [{"name": 5, "value": "5"}])

    @patch(
        "redash.models.parameterized_query._load_result",
        return_value={
            "columns": [{"name": "ID"}, {"name": "fish"}, {"name": "poultry"}],
            "rows": [{"fish": "Clown", "ID": 5, "poultry": "Hen"}],
        },
    )
    def test_dropdown_supports_upper_cased_columns(self, _):
        values = dropdown_values(1, None)
        self.assertEqual(values, [{"name": 5, "value": "5"}])

    @patch(
        "redash.models.Query.get_by_id_and_org",
        return_value=namedtuple("Query", "data_source")(None),
    )
    def test_dropdown_values_raises_when_query_is_detached_from_data_source(self, _):
        with pytest.raises(QueryDetachedFromDataSourceError):
            dropdown_values(1, None)
