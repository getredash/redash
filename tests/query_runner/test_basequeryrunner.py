import unittest

from redash.query_runner import BaseQueryRunner


class TestBaseQueryRunner(unittest.TestCase):
    def setUp(self):
        self.query_runner = BaseQueryRunner({})

    def test_annotations_include_only_constrained_identifiers(self):
        metadata = {
            "user_id": 42,
            "query_id": 7,
            "Job ID": "12345678-1234-1234-1234-123456789abc",
            "Query Hash": "0123456789abcdef0123456789abcdef",
            "Scheduled": True,
            "Username": "*/ SELECT 999; --@example.org",
            "Queue": "*/ SELECT 999; --",
            "unexpected */": "anything",
        }
        self.assertEqual(
            self.query_runner.annotate_query("SELECT 1", metadata),
            "/* user_id: 42, query_id: 7, Job ID: 12345678-1234-1234-1234-123456789abc, "
            "Query Hash: 0123456789abcdef0123456789abcdef, Scheduled: True */ SELECT 1",
        )

    def test_annotations_reject_invalid_values_in_every_allowed_field(self):
        for key in ("user_id", "query_id", "Job ID", "Query Hash", "Scheduled"):
            for value in ("*/ SELECT 999; --", "/* nested */", "42\n", "４２", {"value": 42}, None):
                with self.subTest(key=key, value=value):
                    self.assertEqual(self.query_runner.annotate_query("SELECT 1", {key: value}), "SELECT 1")

    def test_annotations_support_api_and_adhoc_markers(self):
        for identity in ("api", "<ApiKey: Query 7>", "<ApiKey: 9>"):
            with self.subTest(identity=identity):
                self.assertEqual(
                    self.query_runner.annotate_query("SELECT 1", {"user_id": identity, "query_id": "adhoc"}),
                    "/* user_id: {}, query_id: adhoc */ SELECT 1".format(identity),
                )

    def test_disabled_annotations_leave_query_unchanged(self):
        self.query_runner.should_annotate_query = False
        self.assertEqual(self.query_runner.annotate_query("SELECT 1", {"user_id": 42}), "SELECT 1")

    def test_duplicate_column_names_assigned_correctly(self):
        original_column_names = [
            ("name", bool),
            ("created_at", bool),
            ("updated_at", bool),
            ("name", bool),
            ("created_at", bool),
            ("updated_at", bool),
        ]
        expected = [
            {"name": "name", "friendly_name": "name", "type": bool},
            {"name": "created_at", "friendly_name": "created_at", "type": bool},
            {"name": "updated_at", "friendly_name": "updated_at", "type": bool},
            {"name": "name1", "friendly_name": "name1", "type": bool},
            {"name": "created_at1", "friendly_name": "created_at1", "type": bool},
            {"name": "updated_at1", "friendly_name": "updated_at1", "type": bool},
        ]

        new_columns = self.query_runner.fetch_columns(original_column_names)

        self.assertEqual(new_columns, expected)


if __name__ == "__main__":
    unittest.main()
