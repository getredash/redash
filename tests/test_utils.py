from collections import namedtuple
import datetime
import decimal
from unittest import TestCase
import uuid

import pytest

from redash import create_app
from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
)
from redash.utils import (
    build_url,
    collect_parameters_from_request,
    filter_none,
    generate_token,
    json_dumps,
    render_template,
)
from redash.utils.pandas import pandas_installed

DummyRequest = namedtuple("DummyRequest", ["host", "scheme"])

skip_condition = pytest.mark.skipif(not pandas_installed, reason="pandas is not installed")

if pandas_installed:
    import numpy as np
    import pandas as pd

    from redash.utils.pandas import get_column_types_from_dataframe, pandas_to_result


class TestBuildUrl(TestCase):
    def test_simple_case(self):
        self.assertEqual(
            "http://example.com/test",
            build_url(DummyRequest("", "http"), "example.com", "/test"),
        )

    def test_uses_current_request_port(self):
        self.assertEqual(
            "http://example.com:5000/test",
            build_url(DummyRequest("example.com:5000", "http"), "example.com", "/test"),
        )

    def test_uses_current_request_schema(self):
        self.assertEqual(
            "https://example.com/test",
            build_url(DummyRequest("example.com", "https"), "example.com", "/test"),
        )

    def test_skips_port_for_default_ports(self):
        self.assertEqual(
            "https://example.com/test",
            build_url(DummyRequest("example.com:443", "https"), "example.com", "/test"),
        )
        self.assertEqual(
            "http://example.com/test",
            build_url(DummyRequest("example.com:80", "http"), "example.com", "/test"),
        )
        self.assertEqual(
            "https://example.com:80/test",
            build_url(DummyRequest("example.com:80", "https"), "example.com", "/test"),
        )
        self.assertEqual(
            "http://example.com:443/test",
            build_url(DummyRequest("example.com:443", "http"), "example.com", "/test"),
        )


class TestCollectParametersFromRequest(TestCase):
    def test_ignores_non_prefixed_values(self):
        self.assertEqual({}, collect_parameters_from_request({"test": 1}))

    def test_takes_prefixed_values(self):
        self.assertDictEqual(
            {"test": 1, "something_else": "test"},
            collect_parameters_from_request({"p_test": 1, "p_something_else": "test"}),
        )


class TestSkipNones(TestCase):
    def test_skips_nones(self):
        d = {"a": 1, "b": None}

        self.assertDictEqual(filter_none(d), {"a": 1})


class TestJsonDumps(TestCase):
    def test_handles_binary(self):
        self.assertEqual(json_dumps(memoryview(b"test")), '"74657374"')

    def test_handles_bytes(self):
        assert json_dumps({"data": b"hello"}) == '{"data":"68656c6c6f"}'

    def test_handles_decimal(self):
        assert json_dumps({"price": decimal.Decimal("19.99")}) == '{"price":19.99}'

    def test_handles_uuid(self):
        test_uuid = uuid.uuid4()
        assert json_dumps({"id": test_uuid}) == f'{{"id":"{str(test_uuid)}"}}'

    def test_handles_date(self):
        d = datetime.date(2024, 3, 1)
        assert json_dumps({"date": d}) == '{"date":"2024-03-01"}'

    def test_handles_datetime(self):
        dt = datetime.datetime(2024, 3, 1, 15, 30, 45, 123456)
        result = json_dumps({"time": dt})
        assert result.startswith('{"time":"2024-03-01T15:30:45.123"}')
        assert result.endswith('"}') or result.endswith('Z"}')  # handles Z for UTC

    def test_handles_timedelta(self):
        delta = datetime.timedelta(days=2, hours=3)
        assert json_dumps({"delta": delta}) == '{"delta":"2 days, 3:00:00"}'

    def test_handles_time(self):
        t = datetime.time(13, 45, 30, 123456)
        assert json_dumps({"time": t}) == '{"time":"13:45:30.123"}'

    def test_handles_time_with_timezone_raises(self):
        t = datetime.time(13, 45, tzinfo=datetime.timezone.utc)
        with pytest.raises(ValueError, match="timezone-aware times"):
            json_dumps({"time": t})

    def test_handles_sort_keys_true(self):
        self.assertEqual(json_dumps({"b": 1, "a": 2, "c": 3}, sort_keys=True), '{"a":2,"b":1,"c":3}')

    def test_handles_sort_keys_false(self):
        result = json_dumps({"b": 1, "a": 2, "c": 3}, sort_keys=False)
        assert '"a":2' in result
        assert '"b":1' in result
        assert '"c":3' in result


class TestGenerateToken(TestCase):
    def test_format(self):
        token = generate_token(40)
        self.assertRegex(token, r"[a-zA-Z0-9]{40}")


class TestRenderTemplate(TestCase):
    def test_render(self):
        app = create_app()
        with app.app_context():
            d = {
                "failures": [
                    {
                        "id": 1,
                        "name": "Failure Unit Test",
                        "failed_at": "May 04, 2021 02:07PM UTC",
                        "failure_reason": "",
                        "failure_count": 1,
                        "comment": None,
                    }
                ]
            }
            html, text = [render_template("emails/failures.{}".format(f), d) for f in ["html", "txt"]]
            self.assertIn("Failure Unit Test", html)
            self.assertIn("Failure Unit Test", text)


@pytest.fixture
@skip_condition
def mock_dataframe():
    df = pd.DataFrame(
        {
            "boolean_col": [True, False],
            "integer_col": [1, 2],
            "float_col": [1.1, 2.2],
            "date_col": [np.datetime64("2020-01-01"), np.datetime64("2020-05-05")],
            "datetime_col": [np.datetime64("2020-01-01 12:00:00"), np.datetime64("2020-05-05 14:30:00")],
            "string_col": ["A", "B"],
        }
    )
    return df


@skip_condition
def test_get_column_types_from_dataframe(mock_dataframe):
    result = get_column_types_from_dataframe(mock_dataframe)
    expected_output = [
        {"name": "boolean_col", "friendly_name": "boolean_col", "type": TYPE_BOOLEAN},
        {"name": "integer_col", "friendly_name": "integer_col", "type": TYPE_INTEGER},
        {"name": "float_col", "friendly_name": "float_col", "type": TYPE_FLOAT},
        {"name": "date_col", "friendly_name": "date_col", "type": TYPE_DATE},
        {"name": "datetime_col", "friendly_name": "datetime_col", "type": TYPE_DATETIME},
        {"name": "string_col", "friendly_name": "string_col", "type": TYPE_STRING},
    ]

    assert result == expected_output


@skip_condition
def test_pandas_to_result(mock_dataframe):
    result = pandas_to_result(mock_dataframe)

    assert "columns" in result
    assert "rows" in result

    assert mock_dataframe.equals(pd.DataFrame(result["rows"]))
