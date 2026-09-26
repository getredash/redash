from collections import namedtuple
from datetime import datetime, timezone
from unittest import TestCase

import pytest
from mock import patch

from redash.models.parameterized_query import (
    InvalidParameterError,
    ParameterizedQuery,
    QueryDetachedFromDataSourceError,
    dropdown_values,
)


class TestParameterizedQuery(TestCase):
    def test_returns_empty_list_for_regular_query(self):
        query = ParameterizedQuery("SELECT 1")
        self.assertEqual(set([]), query.missing_params)

    def test_finds_all_params_when_missing(self):
        query = ParameterizedQuery("SELECT {{param}} FROM {{table}}")
        self.assertEqual(set(["param", "table"]), query.missing_params)

    def test_finds_all_params(self):
        query = ParameterizedQuery("SELECT {{param}} FROM {{table}}").apply({"param": "value", "table": "value"})
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

    def test_raises_on_parameters_not_in_schema(self):
        schema = [{"name": "bar", "type": "text"}]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"qux": 7})

    def test_raises_on_invalid_text_parameters(self):
        schema = [{"name": "bar", "type": "text"}]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": 7})

    @patch("redash.models.parameterized_query._is_number", side_effect=ArithmeticError)
    def test_raises_on_unexpected_validation_error(self, _):
        schema = [{"name": "bar", "type": "number"}]
        query = ParameterizedQuery("foo", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": 5})

    def test_validates_text_parameters(self):
        schema = [{"name": "bar", "type": "text"}]
        query = ParameterizedQuery("foo {{bar}}", schema)

        query.apply({"bar": "baz"})

        self.assertEqual("foo baz", query.text)

    def test_validates_text_pattern_parameters(self):
        schema = [{"name": "bar", "type": "text-pattern", "regex": "a+"}]
        query = ParameterizedQuery("foo {{bar}}", schema)

        query.apply({"bar": "a"})

        self.assertEqual("foo a", query.text)

    def test_raises_on_invalid_text_pattern_parameters(self):
        schema = schema = [{"name": "bar", "type": "text-pattern", "regex": "a+"}]
        query = ParameterizedQuery("foo {{bar}}", schema)

        with pytest.raises(InvalidParameterError):
            query.apply({"bar": "b"})

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

        query.apply({"bar": {"start": "2000-01-01 12:00:00", "end": "2000-12-31 12:00:00"}})

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

    def test_is_not_safe_if_expecting_text_pattern_parameter(self):
        schema = [{"name": "bar", "type": "text-pattern", "regex": ".*"}]
        query = ParameterizedQuery("foo", schema)

        self.assertFalse(query.is_safe)

    def test_is_not_safe_if_template_has_undeclared_parameter(self):
        query = ParameterizedQuery("select '{{bar}}'", [])

        self.assertFalse(query.is_safe)

    def test_is_safe_if_all_template_parameters_are_declared(self):
        schema = [{"name": "bar", "type": "number"}]
        query = ParameterizedQuery("select {{bar}}", schema)

        self.assertTrue(query.is_safe)

    def test_undeclared_parameters_are_unsafe_in_all_interpolation_forms(self):
        templates = (
            "SELECT {{{value}}}",
            "SELECT {{&value}}",
            "SELECT {{^flag}}{{value}}{{/flag}}",
            "SELECT {{^flag}}{{#nested}}{{{value}}}{{/nested}}{{/flag}}",
        )
        for template in templates:
            with self.subTest(template=template):
                query = ParameterizedQuery(template)
                self.assertFalse(query.is_safe)
                self.assertIn("value", query.missing_params)

    def test_declared_unescaped_parameters_are_validated(self):
        for template in ("SELECT {{{value}}}", "SELECT {{&value}}"):
            with self.subTest(template=template):
                query = ParameterizedQuery(template, [{"name": "value", "type": "number"}])
                self.assertTrue(query.is_safe)
                self.assertEqual({"value"}, query.missing_params)
                with self.assertRaises(InvalidParameterError):
                    query.apply({"value": "1 UNION SELECT 2"})
                query.apply({"value": 42})
                self.assertEqual("SELECT 42", query.text)
                self.assertEqual(set(), query.missing_params)

    def test_declared_range_fields_are_safe(self):
        for parameter_type in ("date-range", "datetime-range", "datetime-range-with-seconds"):
            with self.subTest(parameter_type=parameter_type):
                query = ParameterizedQuery(
                    "SELECT '{{period.start}}', '{{period.end}}'",
                    [{"name": "period", "type": parameter_type}],
                )
                self.assertTrue(query.is_safe)
                query.apply({"period": {"start": "2026-01-01", "end": "2026-01-31"}})
                self.assertEqual("SELECT '2026-01-01', '2026-01-31'", query.text)
                self.assertEqual(set(), query.missing_params)

    def test_range_declaration_does_not_allow_arbitrary_nested_fields(self):
        for field in ("extra", "start.extra", "end.extra"):
            with self.subTest(field=field):
                query = ParameterizedQuery(
                    "SELECT {{{{period.{}}}}}".format(field),
                    [{"name": "period", "type": "date-range"}],
                )
                self.assertFalse(query.is_safe)

    def test_non_range_declaration_does_not_allow_range_fields(self):
        query = ParameterizedQuery("SELECT {{period.start}}", [{"name": "period", "type": "number"}])
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


NOW = datetime(2024, 3, 13, 15, 42, 7, tzinfo=timezone.utc)  # a Wednesday


@patch("redash.models.parameterized_query.utcnow", return_value=NOW)
class TestDynamicDateValues(TestCase):
    """
    Dynamic date and date range values ("d_*") are resolved the same way the
    frontend resolves them before running a query.
    """

    def apply(self, parameter_type, value, template="{{p}}"):
        schema = [{"name": "p", "type": parameter_type}]
        return ParameterizedQuery(template, schema).apply({"p": value})

    def test_resolves_dynamic_date(self, _):
        query = self.apply("date", "d_now")

        self.assertEqual("2024-03-13", query.text)
        self.assertEqual({"p": "2024-03-13"}, query.parameters)

    def test_resolves_dynamic_date_with_time(self, _):
        self.assertEqual("2024-03-13 15:42", self.apply("datetime-local", "d_now").text)
        self.assertEqual("2024-03-12 15:42:07", self.apply("datetime-with-seconds", "d_yesterday").text)

    def test_resolves_dynamic_date_range(self, _):
        query = self.apply("date-range", "d_last_7_days", "{{p.start}} to {{p.end}}")

        self.assertEqual("2024-03-06 to 2024-03-13", query.text)
        self.assertEqual({"p": {"start": "2024-03-06", "end": "2024-03-13"}}, query.parameters)
        self.assertEqual(set(), query.missing_params)

    def test_resolves_dynamic_date_range_with_time(self, _):
        template = "{{p.start}} to {{p.end}}"

        self.assertEqual(
            "2024-03-06 00:00 to 2024-03-13 15:42",
            self.apply("datetime-range", "d_last_7_days", template).text,
        )
        self.assertEqual(
            "2024-03-13 14:42:07 to 2024-03-13 15:42:07",
            self.apply("datetime-range-with-seconds", "d_last_hour", template).text,
        )
        self.assertEqual(
            "2024-03-13 00:00:00 to 2024-03-13 23:59:59",
            self.apply("datetime-range-with-seconds", "d_today", template).text,
        )

    def test_resolves_every_dynamic_date_range_preset(self, _):
        expected = {
            "d_today": ("2024-03-13", "2024-03-13"),
            "d_yesterday": ("2024-03-12", "2024-03-12"),
            "d_this_week": ("2024-03-10", "2024-03-16"),
            "d_this_month": ("2024-03-01", "2024-03-31"),
            "d_this_year": ("2024-01-01", "2024-12-31"),
            "d_last_week": ("2024-03-03", "2024-03-09"),
            "d_last_month": ("2024-02-01", "2024-02-29"),
            "d_last_year": ("2023-01-01", "2023-12-31"),
            "d_last_hour": ("2024-03-13", "2024-03-13"),
            "d_last_8_hours": ("2024-03-13", "2024-03-13"),
            "d_last_24_hours": ("2024-03-12", "2024-03-13"),
            "d_last_7_days": ("2024-03-06", "2024-03-13"),
            "d_last_14_days": ("2024-02-28", "2024-03-13"),
            "d_last_30_days": ("2024-02-12", "2024-03-13"),
            "d_last_60_days": ("2024-01-13", "2024-03-13"),
            "d_last_90_days": ("2023-12-14", "2024-03-13"),
            "d_last_12_months": ("2023-03-13", "2024-03-13"),
            "d_last_2_years": ("2022-03-13", "2024-03-13"),
            "d_last_3_years": ("2021-03-13", "2024-03-13"),
            "d_last_10_years": ("2014-03-13", "2024-03-13"),
        }

        for value, (start, end) in expected.items():
            query = self.apply("date-range", value, "{{p.start}} to {{p.end}}")
            self.assertEqual("{} to {}".format(start, end), query.text, value)

    def test_rejects_unknown_dynamic_values(self, _):
        with pytest.raises(InvalidParameterError):
            self.apply("date-range", "d_last_5_days")

        with pytest.raises(InvalidParameterError):
            self.apply("date", "d_last_7_days")

    def test_leaves_other_parameter_types_alone(self, _):
        self.assertEqual("d_today", self.apply("text", "d_today").text)

    def test_leaves_concrete_values_alone(self, _):
        query = self.apply("date-range", {"start": "2000-01-01", "end": "2000-12-31"}, "{{p.start}} {{p.end}}")

        self.assertEqual("2000-01-01 2000-12-31", query.text)
