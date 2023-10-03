import json
from unittest import TestCase
from unittest.mock import Mock, patch

from redash.query_runner import TYPE_FLOAT, TYPE_STRING
from redash.query_runner.yandex_metrica import YandexMetrica

example_query = """id: 1234567
date1: '2018-07-01'
date2: '2018-07-01'
dimensions: 'ym:pv:month'
metrics: 'ym:pv:pageviews'"""

# пример реального возврата апи метрики
example_response = {
    "query": {
        "ids": [1234567],
        "dimensions": ["ym:pv:month"],
        "metrics": ["ym:pv:pageviews"],
        "sort": ["-ym:pv:pageviews"],
        "date1": "2018-07-01",
        "date2": "2018-07-01",
        "limit": 100,
        "offset": 1,
        "group": "Week",
        "auto_group_size": "1",
        "attr_name": "",
        "quantile": "50",
        "offline_window": "21",
        "attribution": "LastSign",
        "currency": "RUB",
        "adfox_event_id": "0",
    },
    "data": [{"dimensions": [{"name": "7"}], "metrics": [1000.0]}],
    "total_rows": 1,
    "total_rows_rounded": False,
    "sampled": True,
    "contains_sensitive_data": False,
    "sample_share": 0.1,
    "sample_size": 651081,
    "sample_space": 6510809,
    "data_lag": 0,
    "totals": [1000.0],
    "min": [1000.0],
    "max": [1000.0],
}


class TestYandexMetrica(TestCase):
    @patch("requests.get")
    def test_simple_query(self, get_request):
        query_runner = YandexMetrica({"token": "example_token"})

        response = Mock()
        response.status_code = 200
        response.text = json.dumps(example_response)
        response.json.return_value = example_response
        get_request.return_value = response

        data, error = query_runner.run_query(example_query, None)

        self.assertIsNone(error)
        self.assertEqual(
            json.loads(data),
            {
                "columns": [
                    {"name": "ym:pv:month", "friendly_name": "month", "type": TYPE_STRING},
                    {"name": "ym:pv:pageviews", "friendly_name": "pageviews", "type": TYPE_FLOAT},
                ],
                "rows": [
                    {"ym:pv:month": "7", "ym:pv:pageviews": 1000.0},
                ],
            },
        )
