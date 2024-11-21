import json

import pytest
import requests

from redash.query_runner import TYPE_FLOAT, TYPE_STRING
from redash.query_runner.yandex_metrica import YandexMetrica

example_query = """id: 1234567
date1: '2018-07-01'
date2: '2018-07-01'
dimensions: 'ym:pv:month'
metrics: 'ym:pv:pageviews'"""

# an example of a real API metric return
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

expected_data = {
    "columns": [
        {"name": "ym:pv:month", "friendly_name": "month", "type": TYPE_STRING},
        {"name": "ym:pv:pageviews", "friendly_name": "pageviews", "type": TYPE_FLOAT},
    ],
    "rows": [
        {"ym:pv:month": "7", "ym:pv:pageviews": 1000.0},
    ],
}

N_API_CALLS = 3


@pytest.fixture
def mock_yandex_response():
    class MockResponse:
        def __init__(self, status="passing"):
            if status == "passing":
                self.status_code = 200
                self.text = json.dumps(example_response)
                self.json = lambda *args, **kwargs: example_response
                self.ok = True
            elif status == "failing":
                self.status_code = 429
                self.text = json.dumps(example_response)
                self.json = lambda *args, **kwargs: example_response
                self.ok = False

            # for mocking 429's
            self.count = 0

        def __call__(self, *args, **kwargs):
            self.count += 1
            if self.count == N_API_CALLS:
                # return a failing response on N_API_CALLS
                return MockResponse("failing")
            # before/after we get to the Nth call, just return success
            return self

    return MockResponse("passing")


@pytest.fixture
def mocked_requests_get(monkeypatch, mock_yandex_response):
    monkeypatch.setattr(requests, "get", mock_yandex_response)


def test_yandex_metrica_query(mocked_requests_get):
    query_runner = YandexMetrica({"token": "example_token"})
    data, error = query_runner.run_query(example_query, None)

    assert error is None
    assert data == expected_data


def test_yandex_metrica_429(mocked_requests_get):
    query_runner = YandexMetrica({"token": "example_token"})
    # run 3 times in a row to simulate "too many requests"
    for _ in range(N_API_CALLS):
        data, error = query_runner.run_query(example_query, None)
    # we expect to have called `requests.get` 1 more time than we call `run_query`
    assert requests.get.count == N_API_CALLS + 1
