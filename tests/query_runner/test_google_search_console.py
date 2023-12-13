import datetime
from unittest import TestCase

from redash.query_runner.google_search_console import (
    get_formatted_value,
    parse_ga_response,
)


class TestParseGaResponse(TestCase):
    def test_parse_ga_response(self):
        response = {
            "rows": [
                {
                    "keys": ["example", "https://example.com/"],
                    "clicks": 1400,
                    "impressions": 48844,
                    "ctr": 0.5655737704918032,
                    "position": 1.0163934426229508,
                },
                {
                    "keys": ["second keyword example", "https://example.com/example.html"],
                    "clicks": 12300,
                    "impressions": 41944,
                    "ctr": 0.5417661097852029,
                    "position": 1,
                },
            ],
            "responseAggregationType": "byPage",
        }

        dimensions = ["query", "page"]

        expected_value = {
            "columns": [
                {"name": "query", "friendly_name": "query", "type": "string"},
                {"name": "page", "friendly_name": "page", "type": "string"},
                {"name": "clicks", "friendly_name": "clicks", "type": "number"},
                {"name": "impressions", "friendly_name": "impressions", "type": "number"},
                {"name": "ctr", "friendly_name": "ctr", "type": "number"},
                {"name": "position", "friendly_name": "position", "type": "number"},
            ],
            "rows": [
                {
                    "query": "example",
                    "page": "https://example.com/",
                    "clicks": 1400,
                    "impressions": 48844,
                    "ctr": 0.57,
                    "position": 1.02,
                },
                {
                    "query": "second keyword example",
                    "page": "https://example.com/example.html",
                    "clicks": 12300,
                    "impressions": 41944,
                    "ctr": 0.54,
                    "position": 1,
                },
            ],
        }

        value = parse_ga_response(response, dimensions)

        self.assertEqual(value, expected_value)

    def test_parse_ga_response_with_date(self):
        response = {
            "rows": [
                {
                    "keys": ["example keyword", "2022-11-01"],
                    "clicks": 3964,
                    "impressions": 4954,
                    "ctr": 0.8,
                    "position": 1.0161616161616163,
                },
                {
                    "keys": ["second keyword", "2022-11-01"],
                    "clicks": 35033,
                    "impressions": 42443,
                    "ctr": 0.8254716981132075,
                    "position": 1,
                },
            ],
            "responseAggregationType": "byProperty",
        }

        dimensions = ["query", "date"]

        expected_value = {
            "columns": [
                {"name": "query", "friendly_name": "query", "type": "string"},
                {"name": "date", "friendly_name": "date", "type": "date"},
                {"name": "clicks", "friendly_name": "clicks", "type": "number"},
                {"name": "impressions", "friendly_name": "impressions", "type": "number"},
                {"name": "ctr", "friendly_name": "ctr", "type": "number"},
                {"name": "position", "friendly_name": "position", "type": "number"},
            ],
            "rows": [
                {
                    "query": "example keyword",
                    "date": datetime.datetime(2022, 11, 1, 0, 0),
                    "clicks": 3964,
                    "impressions": 4954,
                    "ctr": 0.8,
                    "position": 1.02,
                },
                {
                    "query": "second keyword",
                    "date": datetime.datetime(2022, 11, 1, 0, 0),
                    "clicks": 35033,
                    "impressions": 42443,
                    "ctr": 0.83,
                    "position": 1,
                },
            ],
        }
        value = parse_ga_response(response, dimensions)

        self.assertEqual(value, expected_value)


class TestFormatColumnValue(TestCase):
    def test_string_value(self):
        column_name = "city"
        column_value = "Delhi"

        value = get_formatted_value(column_name, column_value)

        self.assertEqual(value, column_value)

    def test_number_value(self):
        column_name = "number"
        column_value = 25.4145

        value = get_formatted_value(column_name, column_value)

        self.assertEqual(value, 25.41)

    def test_for_date(self):
        column_name = "date"
        column_value = "2023-07-11"

        value = get_formatted_value(column_name, column_value)

        self.assertEqual(value, datetime.datetime.strptime(column_value, "%Y-%m-%d"))

    def test_for_date_hour(self):
        column_name = "datetime"
        column_value = "2023071210"

        value = get_formatted_value(column_name, column_value)

        self.assertEqual(value, datetime.datetime.strptime(column_value, "%Y%m%d%H"))

    def test_for_date_hour_minute(self):
        column_name = "datetime"
        column_value = "202307121030"

        value = get_formatted_value(column_name, column_value)

        self.assertEqual(value, datetime.datetime.strptime(column_value, "%Y%m%d%H%M"))

    def test_when_exception_raise(self):
        column_name = "datetime"
        column_value = "20230712103025"

        with self.assertRaisesRegex(Exception, "Unknown date/time format in results: '20230712103025'"):
            get_formatted_value(column_name, column_value)
