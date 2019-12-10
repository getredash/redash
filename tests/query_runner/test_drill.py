import datetime
from unittest import TestCase

from redash.query_runner import (
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_BOOLEAN,
    TYPE_STRING,
)
from redash.query_runner.drill import convert_type, parse_response


class TestConvertType(TestCase):
    def test_converts_booleans(self):
        self.assertEqual(convert_type("true", TYPE_BOOLEAN), True)
        self.assertEqual(convert_type("True", TYPE_BOOLEAN), True)
        self.assertEqual(convert_type("TRUE", TYPE_BOOLEAN), True)
        self.assertEqual(convert_type("false", TYPE_BOOLEAN), False)
        self.assertEqual(convert_type("False", TYPE_BOOLEAN), False)
        self.assertEqual(convert_type("FALSE", TYPE_BOOLEAN), False)

    def test_converts_strings(self):
        self.assertEqual(convert_type("Текст", TYPE_STRING), "Текст")
        self.assertEqual(convert_type(None, TYPE_STRING), "")
        self.assertEqual(convert_type("", TYPE_STRING), "")
        self.assertEqual(convert_type("redash", TYPE_STRING), "redash")

    def test_converts_integer(self):
        self.assertEqual(convert_type("42", TYPE_INTEGER), 42)

    def test_converts_float(self):
        self.assertAlmostEqual(convert_type("3.14", TYPE_FLOAT), 3.14, 2)

    def test_converts_date(self):
        self.assertEqual(
            convert_type("2018-10-31", TYPE_DATETIME),
            datetime.datetime(2018, 10, 31, 0, 0),
        )


empty_response = {"columns": [], "rows": [{}]}

regular_response = {
    "columns": ["key", "date", "count", "avg"],
    "rows": [
        {"key": "Alpha", "date": "2018-01-01", "count": "10", "avg": "3.14"},
        {"key": "Beta", "date": "2018-02-01", "count": "20", "avg": "6.28"},
    ],
}


class TestParseResponse(TestCase):
    def test_parse_empty_reponse(self):
        parsed = parse_response(empty_response)

        self.assertIsInstance(parsed, dict)
        self.assertIsNotNone(parsed["columns"])
        self.assertIsNotNone(parsed["rows"])
        self.assertEqual(len(parsed["columns"]), 0)
        self.assertEqual(len(parsed["rows"]), 0)

    def test_parse_regular_response(self):
        parsed = parse_response(regular_response)

        self.assertIsInstance(parsed, dict)
        self.assertIsNotNone(parsed["columns"])
        self.assertIsNotNone(parsed["rows"])
        self.assertEqual(len(parsed["columns"]), 4)
        self.assertEqual(len(parsed["rows"]), 2)

        key_col = parsed["columns"][0]
        self.assertEqual(key_col["name"], "key")
        self.assertEqual(key_col["type"], TYPE_STRING)

        date_col = parsed["columns"][1]
        self.assertEqual(date_col["name"], "date")
        self.assertEqual(date_col["type"], TYPE_DATETIME)

        count_col = parsed["columns"][2]
        self.assertEqual(count_col["name"], "count")
        self.assertEqual(count_col["type"], TYPE_INTEGER)

        avg_col = parsed["columns"][3]
        self.assertEqual(avg_col["name"], "avg")
        self.assertEqual(avg_col["type"], TYPE_FLOAT)

        row_0 = parsed["rows"][0]
        self.assertEqual(row_0["key"], "Alpha")
        self.assertEqual(row_0["date"], datetime.datetime(2018, 1, 1, 0, 0))
        self.assertEqual(row_0["count"], 10)
        self.assertAlmostEqual(row_0["avg"], 3.14, 2)

        row_1 = parsed["rows"][1]
        self.assertEqual(row_1["key"], "Beta")
        self.assertEqual(row_1["date"], datetime.datetime(2018, 2, 1, 0, 0))
        self.assertEqual(row_1["count"], 20)
        self.assertAlmostEqual(row_1["avg"], 6.28, 2)
