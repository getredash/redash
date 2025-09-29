from unittest import TestCase
from unittest.mock import patch

from redash.query_runner.duckdb import DuckDB


class TestDuckDBSchema(TestCase):
    def setUp(self) -> None:
        self.runner = DuckDB({"dbpath": ":memory:"})

    @patch.object(DuckDB, "run_query")
    def test_simple_schema_build(self, mock_run_query) -> None:
        # Simulate queries: first for tables, then for DESCRIBE
        mock_run_query.side_effect = [
            (
                {"rows": [{"table_schema": "main", "table_name": "users"}]},
                None,
            ),
            (
                {
                    "rows": [
                        {"column_name": "id", "column_type": "INTEGER"},
                        {"column_name": "name", "column_type": "VARCHAR"},
                    ]
                },
                None,
            ),
        ]

        schema = self.runner.get_schema()
        self.assertEqual(len(schema), 1)
        self.assertEqual(schema[0]["name"], "main.users")
        self.assertListEqual(
            schema[0]["columns"],
            [{"name": "id", "type": "INTEGER"}, {
                "name": "name", "type": "VARCHAR"}],
        )


    @patch.object(DuckDB, "run_query")
    def test_struct_column_handling(self, mock_run_query) -> None:
        # First call: get tables
        mock_run_query.side_effect = [
            (
                {"rows": [{"table_schema": "main", "table_name": "events"}]},
                None,
            ),
            # Second call: DESCRIBE table
            (
                {
                    "rows": [
                        {"column_name": "payload",
                            "column_type": "STRUCT(a INTEGER, b VARCHAR)"}
                    ]
                },
                None,
            ),
        ]

        schema = self.runner.get_schema()

        self.assertEqual(len(schema), 1)
        self.assertEqual(schema[0]["name"], "main.events")
        self.assertEqual(schema[0]["columns"][0]["name"], "payload")
        self.assertTrue(schema[0]["columns"][0]["type"].startswith("STRUCT"))

    @patch.object(DuckDB, "run_query")
    def test_error_propagation(self, mock_run_query) -> None:
        mock_run_query.return_value = (None, "boom")
        with self.assertRaises(Exception) as ctx:
            self.runner.get_schema()
        self.assertIn("boom", str(ctx.exception))
