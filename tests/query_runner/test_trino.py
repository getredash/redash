"""
Some test cases for Trino.
"""

from unittest import TestCase
from unittest.mock import patch

from trino.types import NamedRowTuple

from redash.query_runner.trino import Trino, _convert_row_types


class TestTrino(TestCase):
    catalog_name = "memory"
    schema_name = "default"
    table_name = "users"
    column_name = "id"
    column_type = "integer"

    @patch.object(Trino, "_get_catalogs")
    @patch.object(Trino, "run_query")
    def test_get_schema_no_catalog_set(self, mock_run_query, mock__get_catalogs):
        runner = Trino({})
        self._assert_schema_catalog(mock_run_query, mock__get_catalogs, runner)

    @patch.object(Trino, "_get_catalogs")
    @patch.object(Trino, "run_query")
    def test_get_schema_catalog_set(self, mock_run_query, mock__get_catalogs):
        runner = Trino({"catalog": TestTrino.catalog_name})
        self._assert_schema_catalog(mock_run_query, mock__get_catalogs, runner)

    def _assert_schema_catalog(self, mock_run_query, mock__get_catalogs, runner):
        mock_run_query.return_value = (
            {
                "rows": [
                    {
                        "table_schema": TestTrino.schema_name,
                        "table_name": TestTrino.table_name,
                        "column_name": TestTrino.column_name,
                        "data_type": TestTrino.column_type,
                    }
                ]
            },
            None,
        )
        mock__get_catalogs.return_value = [TestTrino.catalog_name]
        schema = runner.get_schema()
        expected_schema = [
            {
                "name": f"{TestTrino.catalog_name}.{TestTrino.schema_name}.{TestTrino.table_name}",
                "columns": [{"name": TestTrino.column_name, "type": TestTrino.column_type}],
            }
        ]
        self.assertEqual(schema, expected_schema)

    @patch.object(Trino, "run_query")
    def test__get_catalogs(self, mock_run_query):
        mock_run_query.return_value = ({"rows": [{"Catalog": TestTrino.catalog_name}]}, None)
        runner = Trino({})
        catalogs = runner._get_catalogs()
        expected_catalogs = [TestTrino.catalog_name]
        self.assertEqual(catalogs, expected_catalogs)

    def test_get_client_tags_parses_comma_separated_values(self):
        runner = Trino({"client_tags": "finance,  redash  , ,analytics"})
        self.assertEqual(runner._get_client_tags(), ["finance", "redash", "analytics"])

    def test_get_client_tags_returns_none_when_empty(self):
        runner = Trino({"client_tags": " ,  , "})
        self.assertIsNone(runner._get_client_tags())


class TestConvertRowTypes(TestCase):
    def test_plain_values_unchanged(self):
        self.assertEqual(_convert_row_types(42), 42)
        self.assertEqual(_convert_row_types("hello"), "hello")
        self.assertIsNone(_convert_row_types(None))

    def test_named_row_tuple_to_dict(self):
        row = NamedRowTuple([1, "alice"], ["id", "name"], ["integer", "varchar"])
        result = _convert_row_types(row)
        self.assertEqual(result, {"id": 1, "name": "alice"})

    def test_nested_row_tuple(self):
        inner = NamedRowTuple([10, 20], ["x", "y"], ["integer", "integer"])
        outer = NamedRowTuple([1, inner], ["id", "point"], ["integer", "row"])
        result = _convert_row_types(outer)
        self.assertEqual(result, {"id": 1, "point": {"x": 10, "y": 20}})

    def test_row_tuple_inside_list(self):
        row = NamedRowTuple([1, "a"], ["id", "val"], ["integer", "varchar"])
        result = _convert_row_types([row, row])
        self.assertEqual(result, [{"id": 1, "val": "a"}, {"id": 1, "val": "a"}])

    def test_unnamed_fields_get_positional_names(self):
        row = NamedRowTuple([1, 2], [None, None], ["integer", "integer"])
        result = _convert_row_types(row)
        self.assertEqual(result, {"_field0": 1, "_field1": 2})
