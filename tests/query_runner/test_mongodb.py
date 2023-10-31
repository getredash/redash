import datetime
from unittest import TestCase

from freezegun import freeze_time
from mock import patch
from pytz import utc

from redash.query_runner.mongodb import (
    MongoDB,
    _get_column_by_name,
    parse_query_json,
    parse_results,
)
from redash.utils import json_dumps, parse_human_time


@patch("redash.query_runner.mongodb.pymongo.MongoClient")
class TestUserPassOverride(TestCase):
    def test_username_password_present_overrides_username_from_uri(self, mongo_client):
        config = {
            "connectionString": "mongodb://localhost:27017/test",
            "username": "test_user",
            "password": "test_pass",
            "dbName": "test",
        }
        mongo_qr = MongoDB(config)
        _ = mongo_qr._get_db()

        self.assertIn("username", mongo_client.call_args.kwargs)
        self.assertIn("password", mongo_client.call_args.kwargs)

    def test_username_password_absent_does_not_pass_args(self, mongo_client):
        config = {"connectionString": "mongodb://user:pass@localhost:27017/test", "dbName": "test"}
        mongo_qr = MongoDB(config)
        _ = mongo_qr._get_db()

        self.assertNotIn("username", mongo_client.call_args.kwargs)
        self.assertNotIn("password", mongo_client.call_args.kwargs)


class TestParseQueryJson(TestCase):
    def test_ignores_non_isodate_fields(self):
        query = {"test": 1, "test_list": ["a", "b", "c"], "test_dict": {"a": 1, "b": 2}}

        query_data = parse_query_json(json_dumps(query))
        self.assertDictEqual(query_data, query)

    def test_parses_isodate_fields(self):
        query = {
            "test": 1,
            "test_list": ["a", "b", "c"],
            "test_dict": {"a": 1, "b": 2},
            "testIsoDate": 'ISODate("2014-10-03T00:00")',
        }

        query_data = parse_query_json(json_dumps(query))

        self.assertEqual(query_data["testIsoDate"], datetime.datetime(2014, 10, 3, 0, 0))

    def test_parses_isodate_in_nested_fields(self):
        query = {
            "test": 1,
            "test_list": ["a", "b", "c"],
            "test_dict": {"a": 1, "b": {"date": 'ISODate("2014-10-04T00:00")'}},
            "testIsoDate": 'ISODate("2014-10-03T00:00")',
        }

        query_data = parse_query_json(json_dumps(query))

        self.assertEqual(query_data["testIsoDate"], datetime.datetime(2014, 10, 3, 0, 0))
        self.assertEqual(query_data["test_dict"]["b"]["date"], datetime.datetime(2014, 10, 4, 0, 0))

    def test_handles_nested_fields(self):
        # https://github.com/getredash/redash/issues/597
        query = {
            "collection": "bus",
            "aggregate": [
                {
                    "$geoNear": {
                        "near": {
                            "type": "Point",
                            "coordinates": [-22.910079, -43.205161],
                        },
                        "maxDistance": 100000000,
                        "distanceField": "dist.calculated",
                        "includeLocs": "dist.location",
                        "spherical": True,
                    }
                }
            ],
        }

        query_data = parse_query_json(json_dumps(query))

        self.assertDictEqual(query, query_data)

    def test_supports_extended_json_types(self):
        query = {
            "test": 1,
            "test_list": ["a", "b", "c"],
            "test_dict": {"a": 1, "b": 2},
            "testIsoDate": 'ISODate("2014-10-03T00:00")',
            "test$date": {"$date": "2014-10-03T00:00:00.0"},
            "test$undefined": {"$undefined": None},
        }
        query_data = parse_query_json(json_dumps(query))
        self.assertEqual(query_data["test$undefined"], None)
        self.assertEqual(
            query_data["test$date"],
            datetime.datetime(2014, 10, 3, 0, 0).replace(tzinfo=utc),
        )

    @freeze_time("2019-01-01 12:00:00")
    def test_supports_relative_timestamps(self):
        query = {"ts": {"$humanTime": "1 hour ago"}}

        one_hour_ago = parse_human_time("1 hour ago")
        query_data = parse_query_json(json_dumps(query))
        self.assertEqual(query_data["ts"], one_hour_ago)


class TestMongoResults(TestCase):
    def test_parses_regular_results(self):
        raw_results = [
            {"column": 1, "column2": "test"},
            {"column": 2, "column2": "test", "column3": "hello"},
        ]
        rows, columns = parse_results(raw_results)

        for i, row in enumerate(rows):
            self.assertDictEqual(row, raw_results[i])

        self.assertIsNotNone(_get_column_by_name(columns, "column"))
        self.assertIsNotNone(_get_column_by_name(columns, "column2"))
        self.assertIsNotNone(_get_column_by_name(columns, "column3"))

    def test_parses_nested_results(self):
        raw_results = [
            {"column": 1, "column2": "test", "nested": {"a": 1, "b": "str"}},
            {
                "column": 2,
                "column2": "test",
                "column3": "hello",
                "nested": {"a": 2, "b": "str2", "c": "c", "d": {"e": 3}},
            },
        ]

        rows, columns = parse_results(raw_results)

        self.assertDictEqual(rows[0], {"column": 1, "column2": "test", "nested.a": 1, "nested.b": "str"})
        self.assertDictEqual(
            rows[1],
            {
                "column": 2,
                "column2": "test",
                "column3": "hello",
                "nested.a": 2,
                "nested.b": "str2",
                "nested.c": "c",
                "nested.d.e": 3,
            },
        )

        self.assertIsNotNone(_get_column_by_name(columns, "column"))
        self.assertIsNotNone(_get_column_by_name(columns, "column2"))
        self.assertIsNotNone(_get_column_by_name(columns, "column3"))
        self.assertIsNotNone(_get_column_by_name(columns, "nested.a"))
        self.assertIsNotNone(_get_column_by_name(columns, "nested.b"))
        self.assertIsNotNone(_get_column_by_name(columns, "nested.c"))
