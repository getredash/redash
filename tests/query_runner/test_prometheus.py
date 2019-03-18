from datetime import datetime
from unittest import TestCase

from redash.query_runner.prometheus import get_instant_rows, get_range_rows, convert_to_timestamp, parse_date_math


class TestPrometheus(TestCase):
    def setUp(self):
        self.instant_query_result = [
            {
                "metric": {
                    "name": "example_metric_name",
                    "foo_bar": "foo",
                },
                "value": [1516937400.781, "7400_foo"]
            },
            {
                "metric": {
                    "name": "example_metric_name",
                    "foo_bar": "bar",
                },
                "value": [1516937400.781, "7400_bar"]
            }
        ]

        self.range_query_result = [
            {
                "metric": {
                    "name": "example_metric_name",
                    "foo_bar": "foo",
                },
                "values": [
                    [1516937400.781, "7400_foo"],
                    [1516938000.781, "8000_foo"],
                ]
            },
            {
                "metric": {
                    "name": "example_metric_name",
                    "foo_bar": "bar",
                },
                "values": [
                    [1516937400.781, "7400_bar"],
                    [1516938000.781, "8000_bar"],
                ]
            }
        ]

    def test_get_instant_rows(self):
        instant_rows = [
            {
                "name": "example_metric_name",
                "foo_bar": "foo",
                "timestamp": datetime.fromtimestamp(1516937400.781),
                "value": "7400_foo"
            },
            {
                "name": "example_metric_name",
                "foo_bar": "bar",
                "timestamp": datetime.fromtimestamp(1516937400.781),
                "value": "7400_bar"
            },
        ]

        rows = get_instant_rows(self.instant_query_result)
        self.assertEqual(instant_rows, rows)

    def test_get_range_rows(self):

        range_rows = [
            {
                "name": "example_metric_name",
                "foo_bar": "foo",
                "timestamp": datetime.fromtimestamp(1516937400.781),
                "value": "7400_foo"
            },
            {
                "name": "example_metric_name",
                "foo_bar": "foo",
                "timestamp": datetime.fromtimestamp(1516938000.781),
                "value": "8000_foo"
            },
            {
                "name": "example_metric_name",
                "foo_bar": "bar",
                "timestamp": datetime.fromtimestamp(1516937400.781),
                "value": "7400_bar"
            },
            {
                "name": "example_metric_name",
                "foo_bar": "bar",
                "timestamp": datetime.fromtimestamp(1516938000.781),
                "value": "8000_bar"
            },
        ]

        rows = get_range_rows(self.range_query_result)
        self.assertEqual(range_rows, rows)

    def test_convert_to_timestamp(self):
        # test redash fronend datetime string
        self.assertEqual(datetime.fromtimestamp(convert_to_timestamp('2019-03-10 00:00:00')).timetuple(),
                         datetime.strptime('2019-03-10 00:00:00', '%Y-%m-%d %H:%M:%S').timetuple())

        self.assertEqual(datetime.utcfromtimestamp(convert_to_timestamp('2019-03-10T00:00:00Z')).timetuple(),
                         datetime.strptime('2019-03-10 00:00:00', '%Y-%m-%d %H:%M:%S').timetuple())
        # test unit timestamp
        self.assertEqual(convert_to_timestamp('1552147200'), '1552147200')

        # test time units
        start = datetime.now().replace(microsecond=0)
        now = datetime.fromtimestamp(convert_to_timestamp('now'))
        self.assert_(now >= start)
        end = datetime.now().replace(microsecond=0)
        self.assert_(now <= end)

    def test_parse_date_math(self):
        dt = datetime.strptime('2019-03-10 12:34:56', '%Y-%m-%d %H:%M:%S')

        # test year
        self.assertEqual(parse_date_math(dt, '/y', False).timetuple()[:-3], (2019, 1, 1, 0, 0, 0))
        self.assertEqual(parse_date_math(dt, '/y', True).timetuple()[:-3], (2020, 1, 1, 0, 0, 0))
        self.assertEqual(parse_date_math(dt, '+1y').timetuple()[:-3], (2020, 3, 10, 12, 34, 56))
        self.assertEqual(parse_date_math(dt, '-1y').timetuple()[:-3], (2018, 3, 10, 12, 34, 56))

        # test month
        self.assertEqual(parse_date_math(dt, '/M', False).timetuple()[:-3], (2019, 3, 1, 0, 0, 0))
        self.assertEqual(parse_date_math(dt, '/M', True).timetuple()[:-3], (2019, 4, 1, 0, 0, 0))
        self.assertEqual(parse_date_math(dt, '+1M').timetuple()[:-3], (2019, 4, 10, 12, 34, 56))
        self.assertEqual(parse_date_math(dt, '-1M').timetuple()[:-3], (2019, 2, 10, 12, 34, 56))

        # test week
        self.assertEqual(parse_date_math(dt, '/w', False).timetuple()[:-3], (2019, 3, 10, 0, 0, 0))
        self.assertEqual(parse_date_math(dt, '/w', True).timetuple()[:-3], (2019, 3, 17, 0, 0, 0))
        self.assertEqual(parse_date_math(dt, '+1w').timetuple()[:-3], (2019, 3, 17, 12, 34, 56))
        self.assertEqual(parse_date_math(dt, '-1w').timetuple()[:-3], (2019, 3, 3, 12, 34, 56))

        # test day
        self.assertEqual(parse_date_math(dt, '/d', False).timetuple()[:-3], (2019, 3, 10, 0, 0, 0))
        self.assertEqual(parse_date_math(dt, '/d', True).timetuple()[:-3], (2019, 3, 11, 0, 0, 0))
        self.assertEqual(parse_date_math(dt, '+1d').timetuple()[:-3], (2019, 3, 11, 12, 34, 56))
        self.assertEqual(parse_date_math(dt, '-1d').timetuple()[:-3], (2019, 3, 9, 12, 34, 56))

        # test hour
        self.assertEqual(parse_date_math(dt, '/h', False).timetuple()[:-3], (2019, 3, 10, 12, 0, 0))
        self.assertEqual(parse_date_math(dt, '/h', True).timetuple()[:-3], (2019, 3, 10, 13, 0, 0))
        self.assertEqual(parse_date_math(dt, '+1h').timetuple()[:-3], (2019, 3, 10, 13, 34, 56))
        self.assertEqual(parse_date_math(dt, '-1h').timetuple()[:-3], (2019, 3, 10, 11, 34, 56))

        # test minute
        self.assertEqual(parse_date_math(dt, '/m', False).timetuple()[:-3], (2019, 3, 10, 12, 34, 0))
        self.assertEqual(parse_date_math(dt, '/m', True).timetuple()[:-3], (2019, 3, 10, 12, 35, 0))
        self.assertEqual(parse_date_math(dt, '+1m').timetuple()[:-3], (2019, 3, 10, 12, 35, 56))
        self.assertEqual(parse_date_math(dt, '-1m').timetuple()[:-3], (2019, 3, 10, 12, 33, 56))

        # test second
        self.assertEqual(parse_date_math(dt, '/s', False).timetuple()[:-3], (2019, 3, 10, 12, 34, 56))
        self.assertEqual(parse_date_math(dt, '/s', True).timetuple()[:-3], (2019, 3, 10, 12, 34, 57))
        self.assertEqual(parse_date_math(dt, '+1s').timetuple()[:-3], (2019, 3, 10, 12, 34, 57))
        self.assertEqual(parse_date_math(dt, '-1s').timetuple()[:-3], (2019, 3, 10, 12, 34, 55))
