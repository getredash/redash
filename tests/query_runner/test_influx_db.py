from influxdb.resultset import ResultSet

from redash.query_runner import (
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
)
from redash.query_runner.influx_db import _transform_result

raw = {
    "series": [
        {
            "name": "typetest",
            "columns": ["time", "k1", "v1", "v2"],
            "values": [
                ["2023-10-06T13:30:51.323358136Z", "foo", 0.5, 2],
                ["2023-10-06T13:31:08.882953339Z", "bar", 0.6, 4],
            ],
        }
    ]
}

raw_no_rows = {"series": [{"name": "typetest", "columns": ["time", "k1", "v1", "v2"], "values": []}]}


def test_influxdb_result_types_with_rows():
    result = ResultSet(raw)
    transformed = _transform_result([result])
    expected = {
        "columns": [
            {"name": "time", "type": TYPE_STRING},
            {"name": "k1", "type": TYPE_STRING},
            {"name": "v1", "type": TYPE_FLOAT},
            {"name": "v2", "type": TYPE_INTEGER},
        ],
        "rows": [
            {"k1": "foo", "time": "2023-10-06T13:30:51.323358136Z", "v1": 0.5, "v2": 2},
            {"k1": "bar", "time": "2023-10-06T13:31:08.882953339Z", "v1": 0.6, "v2": 4},
        ],
    }
    assert transformed == expected


def test_influxdb_result_types_with_no_rows_are_string():
    result = ResultSet(raw_no_rows)
    transformed = _transform_result([result])
    expected = {
        "columns": [
            {"name": "time", "type": TYPE_STRING},
            {"name": "k1", "type": TYPE_STRING},
            {"name": "v1", "type": TYPE_STRING},
            {"name": "v2", "type": TYPE_STRING},
        ],
        "rows": [],
    }
    assert transformed == expected
