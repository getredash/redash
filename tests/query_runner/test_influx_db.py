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

raw_multiple_series = {
    "series": [
        {
            "name": "first",
            "columns": ["time", "v1"],
            "values": [["2023-10-06T13:30:51.323358136Z", 0.5]],
        },
        {
            "name": "second",
            "tags": {"k1": "foo"},
            "columns": ["time", "v2"],
            "values": [["2023-10-06T13:31:08.882953339Z", 4]],
        },
    ]
}

raw_null_values = {
    "series": [
        {
            "name": "first",
            "columns": ["time", "v1", "v2", "v3"],
            "values": [
                ["2023-10-06T13:30:51.323358136Z", None, None, None],
                ["2023-10-06T13:31:08.882953339Z", 0.5, None, None],
            ],
        },
        {
            "name": "second",
            "columns": ["time", "v2"],
            "values": [["2023-10-06T13:31:26.442548542Z", 4]],
        },
    ]
}


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


def test_influxdb_columns_from_all_series():
    result = ResultSet(raw_multiple_series)
    transformed = _transform_result([result])
    expected = {
        "columns": [
            {"name": "time", "type": TYPE_STRING},
            {"name": "v1", "type": TYPE_FLOAT},
            {"name": "v2", "type": TYPE_INTEGER},
            {"name": "k1", "type": TYPE_STRING},
        ],
        "rows": [
            {"time": "2023-10-06T13:30:51.323358136Z", "v1": 0.5},
            {"time": "2023-10-06T13:31:08.882953339Z", "v2": 4, "k1": "foo"},
        ],
    }
    assert transformed == expected


def test_influxdb_column_types_from_first_non_null_value():
    result = ResultSet(raw_null_values)
    transformed = _transform_result([result])
    expected = {
        "columns": [
            {"name": "time", "type": TYPE_STRING},
            {"name": "v1", "type": TYPE_FLOAT},
            {"name": "v2", "type": TYPE_INTEGER},
            {"name": "v3", "type": TYPE_STRING},
        ],
        "rows": [
            {"time": "2023-10-06T13:30:51.323358136Z", "v1": None, "v2": None, "v3": None},
            {"time": "2023-10-06T13:31:08.882953339Z", "v1": 0.5, "v2": None, "v3": None},
            {"time": "2023-10-06T13:31:26.442548542Z", "v2": 4},
        ],
    }
    assert transformed == expected
