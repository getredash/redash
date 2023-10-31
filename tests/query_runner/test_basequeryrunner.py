import unittest

from redash.query_runner import BaseQueryRunner


class TestBaseQueryRunner(unittest.TestCase):
    def setUp(self):
        self.query_runner = BaseQueryRunner({})

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
