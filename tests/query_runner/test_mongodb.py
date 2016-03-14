import datetime
import json
from unittest import TestCase
from pytz import utc
from redash.query_runner.mongodb import parse_query_json

from redash.utils import parse_human_time


class TestParseQueryJson(TestCase):
    def test_ignores_non_isodate_fields(self):
        query = {
            'test': 1,
            'test_list': ['a', 'b', 'c'],
            'test_dict': {
                'a': 1,
                'b': 2
            }
        }

        query_data = parse_query_json(json.dumps(query))
        self.assertDictEqual(query_data, query)

    def test_parses_isodate_fields(self):
        query = {
            'test': 1,
            'test_list': ['a', 'b', 'c'],
            'test_dict': {
                'a': 1,
                'b': 2
            },
            'testIsoDate': "ISODate(\"2014-10-03T00:00\")"
        }

        query_data = parse_query_json(json.dumps(query))

        self.assertEqual(query_data['testIsoDate'], datetime.datetime(2014, 10, 3, 0, 0))

    def test_parses_isodate_in_nested_fields(self):
        query = {
            'test': 1,
            'test_list': ['a', 'b', 'c'],
            'test_dict': {
                'a': 1,
                'b': {
                    'date': "ISODate(\"2014-10-04T00:00\")"
                }
            },
            'testIsoDate': "ISODate(\"2014-10-03T00:00\")"
        }

        query_data = parse_query_json(json.dumps(query))

        self.assertEqual(query_data['testIsoDate'], datetime.datetime(2014, 10, 3, 0, 0))
        self.assertEqual(query_data['test_dict']['b']['date'], datetime.datetime(2014, 10, 4, 0, 0))

    def test_handles_nested_fields(self):
        # https://github.com/getredash/redash/issues/597
        query = {
            "collection": "bus",
            "aggregate": [
                {
                    "$geoNear": {
                        "near": {"type": "Point", "coordinates": [-22.910079, -43.205161]},
                        "maxDistance": 100000000,
                        "distanceField": "dist.calculated",
                        "includeLocs": "dist.location",
                        "spherical": True
                    }
                }
            ]
        }

        query_data = parse_query_json(json.dumps(query))

        self.assertDictEqual(query, query_data)

    def test_supports_extended_json_types(self):
        query = {
            'test': 1,
            'test_list': ['a', 'b', 'c'],
            'test_dict': {
                'a': 1,
                'b': 2
            },
            'testIsoDate': "ISODate(\"2014-10-03T00:00\")",
            'test$date': {
                '$date': '2014-10-03T00:00:00.0'
            },
            'test$undefined': {
                '$undefined': None
            }
        }
        query_data = parse_query_json(json.dumps(query))
        self.assertEqual(query_data['test$undefined'], None)
        self.assertEqual(query_data['test$date'], datetime.datetime(2014, 10, 3, 0, 0).replace(tzinfo=utc))

    def test_supports_relative_timestamps(self):
        query = {
            'ts': {'$humanTime': '1 hour ago'}
        }

        one_hour_ago = parse_human_time("1 hour ago")
        query_data = parse_query_json(json.dumps(query))
        self.assertEqual(query_data['ts'], one_hour_ago)



