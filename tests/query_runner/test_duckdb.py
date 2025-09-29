from unittest import TestCase
from unittest.mock import patch

from redash.query_runner.duckdb import DuckDB


class TestDuckDBSchema(TestCase):
    def setUp(self) -> None:
        self.runner = DuckDB({"dbpath": ":memory:"})

    @patch.object(DuckDB, "run_query")
    def test_simple_schema_build(self, mock_run_query) -> None:
        mock_run_query.return_value = (
            {
                "rows": [
                    {"table_schema": "main", "table_name": "users", "column_name": "id", "data_type": "INTEGER"},
                    {"table_schema": "main", "table_name": "users", "column_name": "name", "data_type": "VARCHAR"},
                ]
            },
            None,
        )

        schema: dict = {}
        self.runner._get_tables(schema)
        self.assertIn("main.users", schema)
        self.assertListEqual(
            schema["main.users"]["columns"],
            [
                {"name": "id", "type": "INTEGER"},
                {"name": "name", "type": "VARCHAR"},
            ],
        )

    @patch.object(DuckDB, "run_query")
    @patch.object(DuckDB, "_expand_struct")
    def test_struct_column_expansion(self, mock_expand_struct, mock_run_query) -> None:
        mock_run_query.return_value = (
            {
                "rows": [
                    {
                        "table_schema": "main",
                        "table_name": "events",
                        "column_name": "payload",
                        "data_type": "STRUCT(a INTEGER, b VARCHAR)",
                    }
                ]
            },
            None,
        )

        schema: dict = {}
        self.runner._get_tables(schema)

        self.assertIn("main.events", schema)
        self.assertListEqual(
            schema["main.events"]["columns"],
            [{"name": "payload", "type": "STRUCT(a INTEGER, b VARCHAR)"}],
        )
        mock_expand_struct.assert_called_once()

    @patch.object(DuckDB, "run_query")
    def test_error_propagation(self, mock_run_query) -> None:
        mock_run_query.return_value = (None, "boom")
        schema: dict = {}
        with self.assertRaises(Exception) as ctx:
            self.runner._get_tables(schema)
        self.assertIn("boom", str(ctx.exception))
