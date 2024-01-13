import json
from unittest import TestCase
from unittest.mock import Mock, patch

from redash.query_runner import TYPE_DATETIME, TYPE_INTEGER, TYPE_STRING
from redash.query_runner.tinybird import Tinybird

DATASOURCES_RESPONSE = {
    "datasources": [
        {
            "id": "t_datasource_id",
            "name": "test_datasource",
            "columns": [
                {
                    "name": "string_attribute",
                    "type": "String",
                    "nullable": False,
                    "normalized_name": "string_attribute",
                },
                {
                    "name": "number_attribute",
                    "type": "Int32",
                    "nullable": False,
                    "normalized_name": "number_attribute",
                },
                {"name": "date_attribute", "type": "DateTime", "nullable": False, "normalized_name": "date_attribute"},
            ],
        }
    ]
}

PIPES_RESPONSE = {"pipes": [{"id": "t_pipe_id", "name": "test_pipe", "endpoint": "t_endpoint_id", "type": "endpoint"}]}

SCHEMA_RESPONSE = {
    "meta": [
        {"name": "string_attribute", "type": "String"},
        {"name": "number_attribute", "type": "Int32"},
        {"name": "date_attribute", "type": "DateTime"},
    ]
}

QUERY_RESPONSE = {
    **SCHEMA_RESPONSE,
    "data": [
        {"string_attribute": "hello world", "number_attribute": 123, "date_attribute": "2023-01-01 00:00:03.001000"},
    ],
    "rows": 1,
    "statistics": {"elapsed": 0.011556914, "rows_read": 87919, "bytes_read": 17397219},
}


class TestTinybird(TestCase):
    @patch("requests.get")
    def test_get_schema_scans_pipes_and_datasources(self, get_request):
        query_runner = self._build_query_runner()

        get_request.side_effect = self._mock_tinybird_schema_requests

        schema = query_runner.get_schema()

        self.assertEqual(
            schema,
            [
                {"name": "test_datasource", "columns": ["string_attribute", "number_attribute", "date_attribute"]},
                {"name": "test_pipe", "columns": ["string_attribute", "number_attribute", "date_attribute"]},
            ],
        )

        (url,), kwargs = get_request.call_args

        self.assertEqual(kwargs["timeout"], 60)
        self.assertEqual(kwargs["headers"], {"Authorization": "Bearer p.test.token"})

    @patch("requests.get")
    def test_run_query(self, get_request):
        query_runner = self._build_query_runner()

        get_request.return_value = Mock(
            status_code=200, text=json.dumps(QUERY_RESPONSE), json=Mock(return_value=QUERY_RESPONSE)
        )

        data, error = query_runner.run_query("SELECT * FROM test_datasource LIMIT 1", None)

        self.assertIsNone(error)
        self.assertEqual(
            data,
            {
                "columns": [
                    {"name": "string_attribute", "friendly_name": "string_attribute", "type": TYPE_STRING},
                    {"name": "number_attribute", "friendly_name": "number_attribute", "type": TYPE_INTEGER},
                    {"name": "date_attribute", "friendly_name": "date_attribute", "type": TYPE_DATETIME},
                ],
                "rows": [
                    {
                        "string_attribute": "hello world",
                        "number_attribute": 123,
                        "date_attribute": "2023-01-01 00:00:03.001000",
                    }
                ],
            },
        )

        (url,), kwargs = get_request.call_args

        self.assertEqual(url, "https://api.tinybird.co/v0/sql")
        self.assertEqual(kwargs["timeout"], 60)
        self.assertEqual(kwargs["headers"], {"Authorization": "Bearer p.test.token"})
        self.assertEqual(kwargs["params"], {"q": b"SELECT * FROM test_datasource LIMIT 1\nFORMAT JSON"})

    def _mock_tinybird_schema_requests(self, endpoint, **kwargs):
        response = {}

        if endpoint.endswith(Tinybird.PIPES_ENDPOINT):
            response = PIPES_RESPONSE
        if endpoint.endswith(Tinybird.DATASOURCES_ENDPOINT):
            response = DATASOURCES_RESPONSE
        if endpoint.endswith(Tinybird.SQL_ENDPOINT):
            response = SCHEMA_RESPONSE

        return Mock(status_code=200, text=json.dumps(response), json=Mock(return_value=response))

    def _build_query_runner(self):
        return Tinybird({"url": "https://api.tinybird.co", "token": "p.test.token", "timeout": 60})
