import base64
import json
from unittest import TestCase
from unittest.mock import Mock, patch

from requests import Request

from redash.query_runner import TYPE_INTEGER
from redash.query_runner.clickhouse import ClickHouse, split_multi_query

split_multi_query_samples = [
    # Regular query
    ("SELECT 1", ["SELECT 1"]),
    # Multiple data queries inlined
    ("SELECT 1; SELECT 2;", ["SELECT 1", "SELECT 2"]),
    # Multiline data queries
    (
        """
SELECT 1;
SELECT 2;
""",
        ["SELECT 1", "SELECT 2"],
    ),
    # Commented data queries
    (
        """
-- First query single-line commentary
SELECT 1;

/**
 * Second query multi-line commentary
 */
SELECT 2;

-- Tail single-line commentary

/**
 * Tail multi-line commentary
 */
""",
        [
            "-- First query single-line commentary\nSELECT 1",
            "/**\n * Second query multi-line commentary\n */\nSELECT 2",
        ],
    ),
    # Should skip empty statements
    (
        """
;;;
;
SELECT 1;
""",
        ["SELECT 1"],
    ),
]


class TestClickHouseQueriesSplit(TestCase):
    def test_split(self):
        for sample in split_multi_query_samples:
            query, expected = sample

            self.assertEqual(split_multi_query(query), expected)


simple_query_response = {
    "meta": [
        {"name": "1", "type": "UInt8"},
    ],
    "data": [
        {"1": 1},
    ],
    "rows": 1,
    "statistics": {"elapsed": 0.0001278, "rows_read": 1, "bytes_read": 1},
}


class TestClickHouse(TestCase):
    @patch("requests.post")
    def test_send_single_query(self, post_request):
        query_runner = ClickHouse(
            {
                "url": "http://clickhouse:8123",
                "dbname": "system",
                "timeout": 60,
                "user": "reader",
                "password": "password",
                "verify": False,
            }
        )

        response = Mock()
        response.status_code = 200
        response.text = json.dumps(simple_query_response)
        response.json.return_value = simple_query_response
        post_request.return_value = response

        data, error = query_runner.run_query("SELECT 1", None)

        self.assertIsNone(error)
        self.assertEqual(
            data,
            {
                "columns": [
                    {"name": "1", "friendly_name": "1", "type": TYPE_INTEGER},
                ],
                "rows": [
                    {"1": 1},
                ],
            },
        )

        (url,), kwargs = post_request.call_args
        self.assertEqual(url, "http://clickhouse:8123")
        self.assertEqual(kwargs["data"], b"SELECT 1\nFORMAT JSON")
        self.assertEqual(
            kwargs["params"],
            {
                "database": "system",
                "default_format": "JSON",
            },
        )
        self.assertNotIn("user", kwargs["params"])
        self.assertNotIn("password", kwargs["params"])
        self.assertEqual(kwargs["auth"], (b"reader", b"password"))
        self.assertEqual(kwargs["timeout"], 60)
        self.assertFalse(kwargs["verify"])

        prepared_request = Request("POST", url, params=kwargs["params"], auth=kwargs["auth"]).prepare()
        self.assertNotIn("user=", prepared_request.url)
        self.assertNotIn("password=", prepared_request.url)
        self.assertEqual(prepared_request.headers["Authorization"], "Basic cmVhZGVyOnBhc3N3b3Jk")

    @patch("requests.post")
    def test_send_query_encodes_credentials_as_utf8_basic_auth(self, post_request):
        response = Mock()
        response.status_code = 200
        response.text = ""
        post_request.return_value = response

        credentials = [
            ("ascii", "reader", "password"),
            ("latin1", "olá", "café"),
            ("unicode", "пользователь", "пароль"),
            ("password-colon", "reader", "pass:word"),
        ]
        for name, username, password in credentials:
            with self.subTest(name=name):
                query_runner = ClickHouse(
                    {
                        "url": "http://clickhouse:8123",
                        "dbname": "system",
                        "user": username,
                        "password": password,
                    }
                )

                self.assertEqual(query_runner._send_query("SELECT 1"), {})

                (url,), kwargs = post_request.call_args
                self.assertEqual(kwargs["auth"], (username.encode("utf-8"), password.encode("utf-8")))
                prepared_request = Request("POST", url, params=kwargs["params"], auth=kwargs["auth"]).prepare()
                authorization = prepared_request.headers["Authorization"]
                self.assertTrue(authorization.startswith("Basic "))
                self.assertEqual(
                    base64.b64decode(authorization[len("Basic ") :]),
                    "{}:{}".format(username, password).encode("utf-8"),
                )

    @patch("requests.post")
    def test_send_query_rejects_usernames_with_colons(self, post_request):
        query_runner = ClickHouse(
            {
                "url": "http://clickhouse:8123",
                "dbname": "system",
                "user": "invalid:username",
                "password": "password",
            }
        )

        data, error = query_runner.run_query("SELECT 1", None)

        self.assertIsNone(data)
        self.assertEqual(error, "ClickHouse username must not contain ':'")
        self.assertNotIn("invalid:username", error)
        self.assertNotIn("password", error)
        post_request.assert_not_called()

    @patch("requests.post")
    def test_send_multi_query(self, post_request):
        query_runner = ClickHouse({"url": "http://clickhouse:8123", "dbname": "system", "timeout": 60})

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
            data,
            {
                "columns": [
                    {"name": "1", "friendly_name": "1", "type": TYPE_INTEGER},
                ],
                "rows": [
                    {"1": 1},
                ],
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
        self.assert_session_params(kwargs, expected_check="0", expected_timeout=60)

        session_id = kwargs["params"]["session_id"]

        (url,), kwargs = post_request.call_args_list[1]
        self.assertEqual(url, "http://clickhouse:8123")
        self.assertEqual(
            kwargs["data"],
            b"""SELECT * FROM test
FORMAT JSON""",
        )

        self.assert_session_params(kwargs, expected_check="1", expected_timeout=60, expected_id=session_id)

    def assert_session_params(self, kwargs, expected_check, expected_timeout, expected_id=None):
        self.assertEqual(
            kwargs["params"],
            {
                "database": "system",
                "default_format": "JSON",
                "session_id": kwargs["params"]["session_id"],
                "session_check": expected_check,
                "session_timeout": expected_timeout,
            },
        )
        self.assertNotIn("user", kwargs["params"])
        self.assertNotIn("password", kwargs["params"])
        self.assertEqual(kwargs["auth"], (b"default", b""))
        self.assertTrue(kwargs["verify"])
        self.assertEqual(kwargs["params"]["session_check"], expected_check)
        self.assertEqual(kwargs["params"]["session_timeout"], expected_timeout)

        session_id = kwargs["params"]["session_id"]
        self.assertRegex(session_id, r"redash_[a-f0-9]+")

        if expected_id:
            self.assertEqual(kwargs["params"]["session_id"], expected_id)
