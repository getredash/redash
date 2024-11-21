import datetime
from unittest import TestCase

from redash.query_runner.google_analytics4 import (
    format_column_value,
    get_formatted_column_json,
    parse_ga_response,
)


class TestFormatColumnValue(TestCase):
    def setUp(self):
        self.columns = [
            {
                "name": "date",
                "friendly_name": "date",
                "type": "date",
            },
            {
                "name": "dateHour",
                "friendly_name": "dateHour",
                "type": "datetime",
            },
            {
                "name": "dateHourMinute",
                "friendly_name": "dateHourMinute",
                "type": "datetime",
            },
            {
                "name": "city",
                "friendly_name": "city",
                "type": "string",
            },
        ]

    def test_string_value(self):
        column_name = "city"
        column_value = "Delhi"

        value = format_column_value(column_name, column_value, self.columns)

        self.assertEqual(value, column_value)

    def test_for_date(self):
        column_name = "date"
        column_value = "20230711"

        value = format_column_value(column_name, column_value, self.columns)

        self.assertEqual(value, datetime.datetime.strptime(column_value, "%Y%m%d"))

    def test_for_date_hour(self):
        column_name = "dateHour"
        column_value = "2023071210"

        value = format_column_value(column_name, column_value, self.columns)

        self.assertEqual(value, datetime.datetime.strptime(column_value, "%Y%m%d%H"))

    def test_for_date_hour_minute(self):
        column_name = "dateHour"
        column_value = "202307121030"

        value = format_column_value(column_name, column_value, self.columns)

        self.assertEqual(value, datetime.datetime.strptime(column_value, "%Y%m%d%H%M"))

    def test_when_exception_raise(self):
        column_name = "dateHour"
        column_value = "20230712103025"

        with self.assertRaisesRegex(Exception, "Unknown date/time format in results: '20230712103025'"):
            format_column_value(column_name, column_value, self.columns)


class TestGetFormattedColumnJson(TestCase):
    def test_date_column(self):
        column_name = "date"
        expected_response = {
            "name": column_name,
            "friendly_name": column_name,
            "type": "date",
        }

        self.assertEqual(get_formatted_column_json(column_name), expected_response)

    def test_date_hour_column(self):
        column_name = "dateHour"
        expected_response = {
            "name": column_name,
            "friendly_name": column_name,
            "type": "datetime",
        }

        self.assertEqual(get_formatted_column_json(column_name), expected_response)

    def test_other_string(self):
        column_name = "city"
        expected_response = {
            "name": column_name,
            "friendly_name": column_name,
            "type": "string",
        }

        self.assertEqual(get_formatted_column_json(column_name), expected_response)


class TestParseGaResponse(TestCase):
    def test_parse_ga_response(self):
        response = {
            "dimensionHeaders": [{"name": "date"}],
            "metricHeaders": [{"name": "activeUsers", "type": "TYPE_INTEGER"}],
            "rows": [{"dimensionValues": [{"value": "20230713"}], "metricValues": [{"value": "50"}]}],
            "rowCount": 1,
            "metadata": {"currencyCode": "USD", "timeZone": "Asia/Calcutta"},
            "kind": "analyticsData#runReport",
        }

        expected_value = {
            "columns": [
                {"name": "date", "friendly_name": "date", "type": "date"},
                {"name": "activeUsers", "friendly_name": "activeUsers", "type": "string"},
            ],
            "rows": [{"date": datetime.datetime(2023, 7, 13, 0, 0), "activeUsers": "50"}],
        }

        value = parse_ga_response(response)

        self.assertEqual(value, expected_value)

    def test_parse_ga_response_with_date_hour(self):
        response = {
            "dimensionHeaders": [{"name": "dateHour"}],
            "metricHeaders": [{"name": "activeUsers", "type": "TYPE_INTEGER"}],
            "rows": [
                {"dimensionValues": [{"value": "2023071312"}], "metricValues": [{"value": "7"}]},
                {"dimensionValues": [{"value": "2023071318"}], "metricValues": [{"value": "7"}]},
                {"dimensionValues": [{"value": "2023071317"}], "metricValues": [{"value": "5"}]},
                {"dimensionValues": [{"value": "2023071319"}], "metricValues": [{"value": "5"}]},
                {"dimensionValues": [{"value": "2023071320"}], "metricValues": [{"value": "5"}]},
                {"dimensionValues": [{"value": "2023071314"}], "metricValues": [{"value": "4"}]},
                {"dimensionValues": [{"value": "2023071315"}], "metricValues": [{"value": "4"}]},
                {"dimensionValues": [{"value": "2023071302"}], "metricValues": [{"value": "3"}]},
                {"dimensionValues": [{"value": "2023071305"}], "metricValues": [{"value": "3"}]},
                {"dimensionValues": [{"value": "2023071313"}], "metricValues": [{"value": "3"}]},
                {"dimensionValues": [{"value": "2023071306"}], "metricValues": [{"value": "2"}]},
                {"dimensionValues": [{"value": "2023071310"}], "metricValues": [{"value": "2"}]},
                {"dimensionValues": [{"value": "2023071321"}], "metricValues": [{"value": "2"}]},
                {"dimensionValues": [{"value": "2023071300"}], "metricValues": [{"value": "1"}]},
                {"dimensionValues": [{"value": "2023071304"}], "metricValues": [{"value": "1"}]},
                {"dimensionValues": [{"value": "2023071307"}], "metricValues": [{"value": "1"}]},
                {"dimensionValues": [{"value": "2023071308"}], "metricValues": [{"value": "1"}]},
                {"dimensionValues": [{"value": "2023071309"}], "metricValues": [{"value": "1"}]},
                {"dimensionValues": [{"value": "2023071311"}], "metricValues": [{"value": "1"}]},
                {"dimensionValues": [{"value": "2023071316"}], "metricValues": [{"value": "1"}]},
                {"dimensionValues": [{"value": "2023071323"}], "metricValues": [{"value": "1"}]},
            ],
            "rowCount": 21,
            "metadata": {"currencyCode": "USD", "timeZone": "Asia/Calcutta"},
            "kind": "analyticsData#runReport",
        }

        expected_value = {
            "columns": [
                {"name": "dateHour", "friendly_name": "dateHour", "type": "datetime"},
                {"name": "activeUsers", "friendly_name": "activeUsers", "type": "string"},
            ],
            "rows": [
                {"dateHour": datetime.datetime(2023, 7, 13, 12, 0), "activeUsers": "7"},
                {"dateHour": datetime.datetime(2023, 7, 13, 18, 0), "activeUsers": "7"},
                {"dateHour": datetime.datetime(2023, 7, 13, 17, 0), "activeUsers": "5"},
                {"dateHour": datetime.datetime(2023, 7, 13, 19, 0), "activeUsers": "5"},
                {"dateHour": datetime.datetime(2023, 7, 13, 20, 0), "activeUsers": "5"},
                {"dateHour": datetime.datetime(2023, 7, 13, 14, 0), "activeUsers": "4"},
                {"dateHour": datetime.datetime(2023, 7, 13, 15, 0), "activeUsers": "4"},
                {"dateHour": datetime.datetime(2023, 7, 13, 2, 0), "activeUsers": "3"},
                {"dateHour": datetime.datetime(2023, 7, 13, 5, 0), "activeUsers": "3"},
                {"dateHour": datetime.datetime(2023, 7, 13, 13, 0), "activeUsers": "3"},
                {"dateHour": datetime.datetime(2023, 7, 13, 6, 0), "activeUsers": "2"},
                {"dateHour": datetime.datetime(2023, 7, 13, 10, 0), "activeUsers": "2"},
                {"dateHour": datetime.datetime(2023, 7, 13, 21, 0), "activeUsers": "2"},
                {"dateHour": datetime.datetime(2023, 7, 13, 0, 0), "activeUsers": "1"},
                {"dateHour": datetime.datetime(2023, 7, 13, 4, 0), "activeUsers": "1"},
                {"dateHour": datetime.datetime(2023, 7, 13, 7, 0), "activeUsers": "1"},
                {"dateHour": datetime.datetime(2023, 7, 13, 8, 0), "activeUsers": "1"},
                {"dateHour": datetime.datetime(2023, 7, 13, 9, 0), "activeUsers": "1"},
                {"dateHour": datetime.datetime(2023, 7, 13, 11, 0), "activeUsers": "1"},
                {"dateHour": datetime.datetime(2023, 7, 13, 16, 0), "activeUsers": "1"},
                {"dateHour": datetime.datetime(2023, 7, 13, 23, 0), "activeUsers": "1"},
            ],
        }
        value = parse_ga_response(response)

        self.assertEqual(value, expected_value)
