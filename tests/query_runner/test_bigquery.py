import unittest

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
