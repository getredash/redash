"""
Some test cases for Trino.
"""

from unittest import TestCase
from unittest.mock import patch

from redash.query_runner.trino import Trino


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
