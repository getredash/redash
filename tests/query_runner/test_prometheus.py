import datetime
from unittest import TestCase

from redash.query_runner.prometheus import get_instant_rows, get_range_rows


class TestPrometheus(TestCase):
    def setUp(self):
        self.instant_query_result = [
            {
                "metric": {"name": "example_metric_name", "foo_bar": "foo"},
                "value": [1516937400.781, "7400_foo"],
            },
            {
                "metric": {"name": "example_metric_name", "foo_bar": "bar"},
                "value": [1516937400.781, "7400_bar"],
            },
        ]

        self.range_query_result = [
            {
                "metric": {"name": "example_metric_name", "foo_bar": "foo"},
                "values": [[1516937400.781, "7400_foo"], [1516938000.781, "8000_foo"]],
            },
            {
                "metric": {"name": "example_metric_name", "foo_bar": "bar"},
                "values": [[1516937400.781, "7400_bar"], [1516938000.781, "8000_bar"]],
            },
        ]

    def test_get_instant_rows(self):
        instant_rows = [
            {
                "name": "example_metric_name",
                "foo_bar": "foo",
                "timestamp": datetime.datetime.fromtimestamp(1516937400.781),
                "value": "7400_foo",
            },
            {
                "name": "example_metric_name",
                "foo_bar": "bar",
                "timestamp": datetime.datetime.fromtimestamp(1516937400.781),
                "value": "7400_bar",
            },
        ]

        rows = get_instant_rows(self.instant_query_result)
        self.assertEqual(instant_rows, rows)

    def test_get_range_rows(self):

        range_rows = [
            {
                "name": "example_metric_name",
                "foo_bar": "foo",
                "timestamp": datetime.datetime.fromtimestamp(1516937400.781),
                "value": "7400_foo",
            },
            {
                "name": "example_metric_name",
                "foo_bar": "foo",
                "timestamp": datetime.datetime.fromtimestamp(1516938000.781),
                "value": "8000_foo",
            },
            {
                "name": "example_metric_name",
                "foo_bar": "bar",
                "timestamp": datetime.datetime.fromtimestamp(1516937400.781),
                "value": "7400_bar",
            },
            {
                "name": "example_metric_name",
                "foo_bar": "bar",
                "timestamp": datetime.datetime.fromtimestamp(1516938000.781),
                "value": "8000_bar",
            },
        ]

        rows = get_range_rows(self.range_query_result)
        self.assertEqual(range_rows, rows)
