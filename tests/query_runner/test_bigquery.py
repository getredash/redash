import unittest
from unittest import mock

from redash.query_runner.big_query import BigQuery


class TestBigQueryQueryRunner(unittest.TestCase):
    def test_annotate_query_with_use_query_annotation_option(self):
        query_runner = BigQuery({"useQueryAnnotation": True})

        self.assertTrue(query_runner.should_annotate_query)

        metadata = {
            "Username": "username",
            "query_id": "adhoc",
            "Job ID": "job-id",
            "Query Hash": "query-hash",
            "Scheduled": False,
        }

        query = "SELECT a FROM tbl"
        expect = (
            "/* Username: username, query_id: adhoc, "
            "Query Hash: query-hash, "
            "Scheduled: False */ SELECT a FROM tbl"
        )

        self.assertEqual(query_runner.annotate_query(query, metadata), expect)

    def test_annotate_query_without_use_query_annotation_option(self):
        query_runner = BigQuery({"useQueryAnnotation": False})

        self.assertFalse(query_runner.should_annotate_query)

        metadata = {
            "Username": "user-name",
            "query_id": "adhoc",
            "Job ID": "job-id",
            "Query Hash": "query-hash",
            "Scheduled": False,
        }

        query = "SELECT a FROM tbl"
        expect = query

        self.assertEqual(query_runner.annotate_query(query, metadata), expect)

    def test_get_schema_skips_datasets_without_access(self):
        query_runner = BigQuery({"projectId": "test-project", "loadSchema": True})

        datasets = [
            {"datasetReference": {"datasetId": "accessible"}, "location": "US"},
            {"datasetReference": {"datasetId": "forbidden"}, "location": "US"},
        ]

        def fake_run_query(query, user):
            if "forbidden" in query:
                return None, "Access Denied: ... PERMISSION_DENIED"
            if "COLUMN_FIELD_PATHS" in query:
                return {
                    "rows": [
                        {
                            "table_schema": "accessible",
                            "table_name": "t1",
                            "field_path": "id",
                            "data_type": "INT64",
                            "description": None,
                        }
                    ]
                }, None
            return {
                "rows": [
                    {
                        "table_schema": "accessible",
                        "table_name": "t1",
                        "table_description": "desc",
                    }
                ]
            }, None

        with mock.patch.object(BigQuery, "_get_project_datasets", return_value=datasets), mock.patch.object(
            BigQuery, "run_query", side_effect=fake_run_query
        ):
            schema = query_runner.get_schema()

        self.assertEqual([table["name"] for table in schema], ["accessible.t1"])
        self.assertEqual(schema[0]["columns"][0]["name"], "id")
        self.assertEqual(schema[0]["description"], "desc")

    def test_get_schema_uses_single_batched_query_when_all_accessible(self):
        query_runner = BigQuery({"projectId": "test-project", "loadSchema": True})

        datasets = [
            {"datasetReference": {"datasetId": "ds_a"}, "location": "US"},
            {"datasetReference": {"datasetId": "ds_b"}, "location": "US"},
        ]

        def fake_run_query(query, user):
            if "COLUMN_FIELD_PATHS" in query:
                return {
                    "rows": [
                        {
                            "table_schema": "ds_a",
                            "table_name": "t",
                            "field_path": "id",
                            "data_type": "INT64",
                            "description": None,
                        }
                    ]
                }, None
            return {"rows": []}, None

        with mock.patch.object(BigQuery, "_get_project_datasets", return_value=datasets), mock.patch.object(
            BigQuery, "run_query", side_effect=fake_run_query
        ) as run_query:
            query_runner.get_schema()

        # One batched columns query + one batched table-options query, no per-dataset fallback.
        self.assertEqual(run_query.call_count, 2)
        for call in run_query.call_args_list:
            self.assertIn("UNION ALL", call.args[0])
