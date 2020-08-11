import json
from unittest import TestCase
from unittest.mock import Mock, patch

from redash.query_runner import TYPE_INTEGER
from redash.query_runner.clickhouse import ClickHouse, split_multi_query

split_multi_query_samples = [
    # Single query without ";\n" should not be splitted
    ("SELECT 1", ["SELECT 1"]),
    # Multiple queries inlined should not be splitted
    ("SELECT 1; SELECT 2;", ["SELECT 1; SELECT 2"]),
    # Multiline-separated queries should be splitted
    (
        """
SELECT 1;
SELECT 2;
""",
        ["SELECT 1", "SELECT 2"],
    ),
    # Should not split after ; and escaped new line
    (
        """
SELECT *
FROM table
WHERE field LIKE ';\\n'
        """,
        [
            """SELECT *
FROM table
WHERE field LIKE ';\\n'"""
        ],
    ),
]


class TestSplitMultiQuery(TestCase):
    def test_split(self):
        for sample in split_multi_query_samples:
            query, expected = sample

            self.assertEqual(split_multi_query(query), expected)


simple_query_response = {
    "meta": [{"name": "1", "type": "UInt8"},],
    "data": [{"1": 1},],
    "rows": 1,
    "statistics": {"elapsed": 0.0001278, "rows_read": 1, "bytes_read": 1},
}


class TestClickHouse(TestCase):
    @patch("requests.post")
    def test_send_single_query(self, post_request):
        query_runner = ClickHouse(
            {"url": "http://clickhouse:8123", "dbname": "system", "timeout": 60}
        )

        response = Mock()
        response.status_code = 200
        response.text = json.dumps(simple_query_response)
        response.json.return_value = simple_query_response
        post_request.return_value = response

        data, error = query_runner.run_query("SELECT 1", None)

        self.assertIsNone(error)
        self.assertEqual(
            json.loads(data),
            {
                "columns": [{"name": "1", "friendly_name": "1", "type": TYPE_INTEGER},],
                "rows": [{"1": 1},],
            },
        )

        (url,), kwargs = post_request.call_args
        self.assertEqual(url, "http://clickhouse:8123")
        self.assertEqual(kwargs["data"], b"SELECT 1\nFORMAT JSON")
        self.assertEqual(
            kwargs["params"], {"user": "default", "password": "", "database": "system"}
        )
        self.assertEqual(kwargs["timeout"], 60)

    @patch("requests.post")
    def test_send_multi_query(self, post_request):
        query_runner = ClickHouse(
            {"url": "http://clickhouse:8123", "dbname": "system", "timeout": 60}
        )

        create_table_response = Mock()
        create_table_response.status_code = 200
        create_table_response.text = ""

        select_response = Mock()
        select_response.status_code = 200
        select_response.text = json.dumps(simple_query_response)
        select_response.json.return_value = simple_query_response

        post_request.side_effect = [create_table_response, select_response]

        data, error = query_runner.run_query(
            """
CREATE
TEMPORARY TABLE test AS
SELECT 1;
SELECT * FROM test;
        """,
            None,
        )

        self.assertIsNone(error)
        self.assertEqual(
            json.loads(data),
            {
                "columns": [{"name": "1", "friendly_name": "1", "type": TYPE_INTEGER},],
                "rows": [{"1": 1},],
            },
        )

        (url,), kwargs = post_request.call_args_list[0]
        self.assertEqual(url, "http://clickhouse:8123")
        self.assertEqual(
            kwargs["data"],
            b"""CREATE
TEMPORARY TABLE test AS
SELECT 1
FORMAT JSON""",
        )

        self.assertEqual(kwargs["params"]["session_check"], "0")
        self.assertEqual(kwargs["params"]["session_timeout"], 60)

        session_id = kwargs["params"]["session_id"]
        self.assertRegex(session_id, r"redash_[a-f0-9]+")

        (url,), kwargs = post_request.call_args_list[1]
        self.assertEqual(url, "http://clickhouse:8123")
        self.assertEqual(
            kwargs["data"],
            b"""SELECT * FROM test
FORMAT JSON""",
        )

        self.assertEqual(kwargs["params"]["session_check"], "1")
        self.assertEqual(kwargs["params"]["session_timeout"], 60)
        self.assertEqual(kwargs["params"]["session_id"], session_id)
