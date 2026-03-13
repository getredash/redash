from redash.utils import json_dumps, json_loads
from tests import BaseTestCase


class TestJsonDumps(BaseTestCase):
    """
    NaN, Inf, and -Inf are sanitized to None.
    """

    def test_data_with_nan_is_sanitized(self):
        input_data = {
            "columns": [
                {"name": "_col0", "friendly_name": "_col0", "type": "float"},
                {"name": "_col1", "friendly_name": "_col1", "type": "float"},
                {"name": "_col2", "friendly_name": "_col1", "type": "float"},
                {"name": "_col3", "friendly_name": "_col1", "type": "float"},
            ],
            "rows": [{"_col0": 1.0, "_col1": float("nan"), "_col2": float("inf"), "_col3": float("-inf")}],
        }
        expected_output_data = {
            "columns": [
                {"name": "_col0", "friendly_name": "_col0", "type": "float"},
                {"name": "_col1", "friendly_name": "_col1", "type": "float"},
                {"name": "_col2", "friendly_name": "_col1", "type": "float"},
                {"name": "_col3", "friendly_name": "_col1", "type": "float"},
            ],
            "rows": [{"_col0": 1.0, "_col1": None, "_col2": None, "_col3": None}],
        }
        json_data = json_dumps(input_data)
        actual_output_data = json_loads(json_data)
        self.assertEqual(actual_output_data, expected_output_data)


class TestJsonDumpsBigInt(BaseTestCase):
    """
    Integers exceeding JavaScript's Number.MAX_SAFE_INTEGER are converted to strings
    to avoid precision loss when parsed by JSON.parse() in the browser.
    """

    def test_safe_integers_unchanged(self):
        data = {"value": 9007199254740991}  # MAX_SAFE_INTEGER
        result = json_loads(json_dumps(data))
        self.assertEqual(result["value"], 9007199254740991)

    def test_unsafe_positive_integer_becomes_string(self):
        data = {"value": 9007199254740992}  # MAX_SAFE_INTEGER + 1
        result = json_loads(json_dumps(data))
        self.assertEqual(result["value"], "9007199254740992")

    def test_unsafe_negative_integer_becomes_string(self):
        data = {"value": -9007199254740992}
        result = json_loads(json_dumps(data))
        self.assertEqual(result["value"], "-9007199254740992")

    def test_bigint_in_nested_structure(self):
        data = {
            "rows": [{"id": 1, "timestamp": 1771858801316128013}],
        }
        result = json_loads(json_dumps(data))
        self.assertEqual(result["rows"][0]["id"], 1)
        self.assertEqual(result["rows"][0]["timestamp"], "1771858801316128013")

    def test_bigint_in_list(self):
        data = [1, 9007199254740992, 3]
        result = json_loads(json_dumps(data))
        self.assertEqual(result, [1, "9007199254740992", 3])

    def test_booleans_not_affected(self):
        data = {"flag": True}
        result = json_loads(json_dumps(data))
        self.assertIs(result["flag"], True)

    def test_query_result_column_type_preserved_for_unsafe_integers(self):
        """Column type stays 'integer' even when values are converted to strings.
        The frontend handles displaying string values in integer columns."""
        data = {
            "columns": [
                {"name": "id", "friendly_name": "id", "type": "integer"},
                {"name": "time", "friendly_name": "time", "type": "integer"},
                {"name": "name", "friendly_name": "name", "type": "string"},
            ],
            "rows": [
                {"id": 1, "time": 1771858801316128013, "name": "test"},
            ],
        }
        result = json_loads(json_dumps(data))
        col_types = {c["name"]: c["type"] for c in result["columns"]}
        self.assertEqual(col_types["id"], "integer")
        self.assertEqual(col_types["time"], "integer")
        self.assertEqual(col_types["name"], "string")
        self.assertEqual(result["rows"][0]["id"], 1)
        self.assertEqual(result["rows"][0]["time"], "1771858801316128013")
