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
