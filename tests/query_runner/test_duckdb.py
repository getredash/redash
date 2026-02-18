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
                {
                    "rows": [
                        {
                            "table_catalog": "memory",
                            "table_schema": "main",
                            "table_name": "users",
                        }
                    ]
                },
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
            [{"name": "id", "type": "INTEGER"}, {"name": "name", "type": "VARCHAR"}],
        )

    @patch.object(DuckDB, "run_query")
    def test_struct_column_expansion(self, mock_run_query) -> None:
        # First call to run_query -> tables list
        mock_run_query.side_effect = [
            (
                {
                    "rows": [
                        {
                            "table_catalog": "memory",
                            "table_schema": "main",
                            "table_name": "events",
                        }
                    ]
                },
                None,
            ),
            # Second call -> DESCRIBE output
            (
                {
                    "rows": [
                        {
                            "column_name": "payload",
                            "column_type": "STRUCT(a INTEGER, b VARCHAR)",
                        }
                    ]
                },
                None,
            ),
        ]

        schema_list = self.runner.get_schema()
        self.assertEqual(len(schema_list), 1)
        schema = schema_list[0]

        # Ensure both raw and expanded struct fields are present
        self.assertIn("main.events", schema["name"])
        self.assertListEqual(
            schema["columns"],
            [
                {"name": "payload", "type": "STRUCT(a INTEGER, b VARCHAR)"},
                {"name": "payload.a", "type": "INTEGER"},
                {"name": "payload.b", "type": "VARCHAR"},
            ],
        )

    def test_nested_struct_expansion(self) -> None:
        runner = DuckDB({"dbpath": ":memory:"})
        runner.con.execute(
            """
            CREATE TABLE sample_struct_table (
                id INTEGER,
                info STRUCT(
                    name VARCHAR,
                    metrics STRUCT(score DOUBLE, rank INTEGER),
                    tags STRUCT(primary_tag VARCHAR, secondary_tag VARCHAR)
                )
            );
        """
        )

        schema = runner.get_schema()
        table = next(t for t in schema if t["name"] == "main.sample_struct_table")
        colnames = [c["name"] for c in table["columns"]]

        assert "info" in colnames
        assert 'info."name"' in colnames
        assert "info.metrics" in colnames
        assert "info.metrics.score" in colnames
        assert "info.metrics.rank" in colnames
        assert "info.tags.primary_tag" in colnames
        assert "info.tags.secondary_tag" in colnames

    @patch.object(DuckDB, "run_query")
    def test_motherduck_catalog_included(self, mock_run_query) -> None:
        # Test that non-default catalogs (like MotherDuck) include catalog in name
        mock_run_query.side_effect = [
            (
                {
                    "rows": [
                        {
                            "table_catalog": "sample_data",
                            "table_schema": "kaggle",
                            "table_name": "movies",
                        }
                    ]
                },
                None,
            ),
            (
                {
                    "rows": [
                        {"column_name": "title", "column_type": "VARCHAR"},
                    ]
                },
                None,
            ),
        ]

        schema = self.runner.get_schema()
        self.assertEqual(len(schema), 1)
        # Should include catalog name for non-default catalogs
        self.assertEqual(schema[0]["name"], "sample_data.kaggle.movies")

    @patch.object(DuckDB, "run_query")
    def test_error_propagation(self, mock_run_query) -> None:
        mock_run_query.return_value = (None, "boom")
        with self.assertRaises(Exception) as ctx:
            self.runner.get_schema()
        self.assertIn("boom", str(ctx.exception))
