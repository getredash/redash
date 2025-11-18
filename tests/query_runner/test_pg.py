from unittest import TestCase

from redash.query_runner.pg import build_schema


class TestBuildSchema(TestCase):
    def test_handles_dups_between_public_and_other_schemas(self):
        results = {
            "rows": [
                {
                    "table_schema": "public",
                    "table_name": "main.users",
                    "column_name": "id",
                },
                {"table_schema": "main", "table_name": "users", "column_name": "id"},
                {"table_schema": "main", "table_name": "users", "column_name": "name"},
            ]
        }

        schema = {}

        build_schema(results, schema)

        self.assertIn("main.users", schema.keys())
        self.assertListEqual(schema["main.users"]["columns"], ["id", "name"])
        self.assertIn('public."main.users"', schema.keys())
        self.assertListEqual(schema['public."main.users"']["columns"], ["id"])

    def test_build_schema_with_data_types(self):
        results = {
            "rows": [
                {"table_schema": "main", "table_name": "users", "column_name": "id", "data_type": "integer"},
                {"table_schema": "main", "table_name": "users", "column_name": "name", "data_type": "varchar"},
            ]
        }

        schema = {}

        build_schema(results, schema)

        self.assertListEqual(
            schema["main.users"]["columns"], [{"name": "id", "type": "integer"}, {"name": "name", "type": "varchar"}]
        )

    def test_build_schema_with_data_types_with_special_table_names(self):
        results = {
            "rows": [
                {"table_schema": "public", "table_name": "org Table", "column_name": "id", "data_type": "integer"},
                {
                    "table_schema": "public",
                    "table_name": "org Table",
                    "column_name": "name",
                    "data_type": "character varying",
                },
                {
                    "table_schema": "public",
                    "table_name": "org Table",
                    "column_name": "created_at",
                    "data_type": "timestamp without time zone",
                },
                {"table_schema": "public", "table_name": "org1Table", "column_name": "id", "data_type": "integer"},
                {
                    "table_schema": "public",
                    "table_name": "org1Table",
                    "column_name": "name",
                    "data_type": "character varying",
                },
                {
                    "table_schema": "public",
                    "table_name": "org1Table",
                    "column_name": "created_at",
                    "data_type": "timestamp without time zone",
                },
                {"table_schema": "public", "table_name": "orgTable", "column_name": "id", "data_type": "integer"},
                {
                    "table_schema": "public",
                    "table_name": "orgTable",
                    "column_name": "name",
                    "data_type": "character varying",
                },
                {
                    "table_schema": "public",
                    "table_name": "org Tablemview",
                    "column_name": "id",
                    "data_type": None,
                },  # materialized view with no data types
                {
                    "table_schema": "public",
                    "table_name": "org1Tablemview",
                    "column_name": "created_at",
                    "data_type": None,
                },  # materialized view with no data types
            ]
        }

        schema = {}

        build_schema(results, schema)

        self.assertListEqual(
            schema["orgTable"]["columns"],
            [{"name": "id", "type": "integer"}, {"name": "name", "type": "character varying"}],
        )

        self.assertListEqual(
            schema["org Table"]["columns"],
            [
                {"name": "id", "type": "integer"},
                {"name": "name", "type": "character varying"},
                {"name": "created_at", "type": "timestamp without time zone"},
            ],
        )

        self.assertListEqual(
            schema["org1Table"]["columns"],
            [
                {"name": "id", "type": "integer"},
                {"name": "name", "type": "character varying"},
                {"name": "created_at", "type": "timestamp without time zone"},
            ],
        )

        self.assertListEqual(
            schema["orgTable"]["columns"],
            [{"name": "id", "type": "integer"}, {"name": "name", "type": "character varying"}],
        )

        self.assertListEqual(
            schema["org Table"]["columns"],
            [
                {"name": "id", "type": "integer"},
                {"name": "name", "type": "character varying"},
                {"name": "created_at", "type": "timestamp without time zone"},
            ],
        )

        self.assertListEqual(
            schema["org1Table"]["columns"],
            [
                {"name": "id", "type": "integer"},
                {"name": "name", "type": "character varying"},
                {"name": "created_at", "type": "timestamp without time zone"},
            ],
        )

        self.assertListEqual(
            schema["orgTable"]["columns"],
            [{"name": "id", "type": "integer"}, {"name": "name", "type": "character varying"}],
        )

        self.assertListEqual(
            schema["org Table"]["columns"],
            [
                {"name": "id", "type": "integer"},
                {"name": "name", "type": "character varying"},
                {"name": "created_at", "type": "timestamp without time zone"},
            ],
        )

        self.assertListEqual(
            schema["org1Table"]["columns"],
            [
                {"name": "id", "type": "integer"},
                {"name": "name", "type": "character varying"},
                {"name": "created_at", "type": "timestamp without time zone"},
            ],
        )

        self.assertListEqual(schema["org Tablemview"]["columns"], ["id"])

        self.assertListEqual(schema["org1Tablemview"]["columns"], ["created_at"])
