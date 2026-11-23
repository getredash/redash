import unittest
from unittest import mock

from redash.query_runner.big_query import BigQuery


class TestBigQueryQueryRunner(unittest.TestCase):
    def test_annotate_query_with_use_query_annotation_option(self):
        query_runner = BigQuery({"useQueryAnnotation": True})

        self.assertTrue(query_runner.should_annotate_query)

        metadata = {
            "user_id": 42,
            "query_id": "adhoc",
            "Job ID": "12345678-1234-1234-1234-123456789abc",
            "Query Hash": "0123456789abcdef0123456789abcdef",
            "Scheduled": False,
        }

        query = "SELECT a FROM tbl"
        expect = (
            "/* user_id: 42, query_id: adhoc, "
            "Query Hash: 0123456789abcdef0123456789abcdef, "
            "Scheduled: False */ SELECT a FROM tbl"
        )

        self.assertEqual(query_runner.annotate_query(query, metadata), expect)

    def test_annotate_query_without_use_query_annotation_option(self):
        query_runner = BigQuery({"useQueryAnnotation": False})

        self.assertFalse(query_runner.should_annotate_query)

        metadata = {
            "user_id": 42,
            "query_id": "adhoc",
            "Job ID": "12345678-1234-1234-1234-123456789abc",
            "Query Hash": "0123456789abcdef0123456789abcdef",
            "Scheduled": False,
        }

        query = "SELECT a FROM tbl"
        expect = query

        self.assertEqual(query_runner.annotate_query(query, metadata), expect)

    @mock.patch.object(BigQuery, "_get_bigquery_service")
    def _run_query(self, fields, rows, get_service):
        jobs = get_service.return_value.jobs.return_value
        jobs.insert.return_value.execute.return_value = {"jobReference": {"jobId": "job", "location": "US"}}
        reply = {"jobComplete": True, "schema": {"fields": fields}, "totalRows": str(len(rows))}
        jobs.getQueryResults.return_value.execute.side_effect = [{**reply, "rows": rows}, reply]

        data, error = BigQuery({"projectId": "project"}).run_query("SELECT * FROM packages", None)
        self.assertIsNone(error)
        return data

    def test_flattens_nested_record_fields(self):
        fields = [
            {"name": "id", "type": "INTEGER"},
            {
                "name": "details",
                "type": "RECORD",
                "fields": [
                    {"name": "version", "type": "RECORD", "fields": [{"name": "major", "type": "INTEGER"}]},
                    {
                        "name": "files",
                        "type": "RECORD",
                        "mode": "REPEATED",
                        "fields": [{"name": "name", "type": "STRING"}],
                    },
                ],
            },
        ]
        version = {"f": [{"v": "3"}]}
        file_record = {"f": [{"v": "package.whl"}]}
        details = {"f": [{"v": version}, {"v": [{"v": file_record}]}]}
        rows = [{"f": [{"v": "1"}, {"v": details}]}, {"f": [{"v": "2"}, {"v": None}]}]

        data = self._run_query(fields, rows)

        self.assertEqual(
            data["columns"],
            [
                {"name": "id", "friendly_name": "id", "type": "integer"},
                {"name": "details.version.major", "friendly_name": "details.version.major", "type": "integer"},
                {"name": "details.files", "friendly_name": "details.files", "type": "string"},
            ],
        )
        self.assertEqual(
            data["rows"],
            [
                {"id": 1, "details.version.major": 3, "details.files": [{"name": "package.whl"}]},
                {"id": 2, "details.version.major": None, "details.files": None},
            ],
        )

    def test_returns_nested_columns_for_empty_results(self):
        fields = [{"name": "details", "type": "STRUCT", "fields": [{"name": "size", "type": "INTEGER"}]}]

        data = self._run_query(fields, [])

        self.assertEqual(data["rows"], [])
        self.assertEqual(
            data["columns"], [{"name": "details.size", "friendly_name": "details.size", "type": "integer"}]
        )
