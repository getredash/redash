import csv
import io
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock, patch

from redash.serializers import (
    serialize_query_result,
    serialize_query_result_to_dsv,
)
from tests import BaseTestCase

data = {
    "rows": [
        {"datetime": "2019-05-26T12:39:23.026Z", "bool": True, "date": "2019-05-26"},
        {"datetime": "", "bool": False, "date": ""},
        {"datetime": None, "bool": None, "date": None},
        {"datetime": 459, "bool": None, "date": 123},
        {"datetime": "459", "bool": None, "date": "123"},
    ],
    "columns": [
        {"friendly_name": "bool", "type": "boolean", "name": "bool"},
        {"friendly_name": "date", "type": "datetime", "name": "datetime"},
        {"friendly_name": "date", "type": "date", "name": "date"},
    ],
}


class QueryResultSerializationTest(BaseTestCase):
    def test_serializes_all_keys_for_authenticated_users(self):
        query_result = self.factory.create_query_result(data={})
        serialized = serialize_query_result(query_result, False)
        self.assertSetEqual(set(query_result.to_dict().keys()), set(serialized.keys()))

    def test_doesnt_serialize_sensitive_keys_for_unauthenticated_users(self):
        query_result = self.factory.create_query_result(data={})
        serialized = serialize_query_result(query_result, True)
        self.assertSetEqual(set(["data", "retrieved_at"]), set(serialized.keys()))


class DsvSerializationTest(BaseTestCase):
    def delimited_content(self, delimiter):
        query_result = self.factory.create_query_result(data=data)
        return serialize_query_result_to_dsv(query_result, delimiter)

    def test_serializes_booleans_correctly(self):
        with self.app.test_request_context("/"):
            parsed = csv.DictReader(io.StringIO(self.delimited_content(",")))
        rows = list(parsed)

        self.assertEqual(rows[0]["bool"], "true")
        self.assertEqual(rows[1]["bool"], "false")
        self.assertEqual(rows[2]["bool"], "")

    def test_serializes_datatime_with_correct_format(self):
        with self.app.test_request_context("/"):
            parsed = csv.DictReader(io.StringIO(self.delimited_content(",")))
        rows = list(parsed)

        self.assertEqual(rows[0]["datetime"], "26/05/19 12:39")
        self.assertEqual(rows[1]["datetime"], "")
        self.assertEqual(rows[2]["datetime"], "")
        self.assertEqual(rows[0]["date"], "26/05/19")
        self.assertEqual(rows[1]["date"], "")
        self.assertEqual(rows[2]["date"], "")

    def test_serializes_datatime_as_is_in_case_of_error(self):
        with self.app.test_request_context("/"):
            parsed = csv.DictReader(io.StringIO(self.delimited_content(",")))
        rows = list(parsed)

        self.assertEqual(rows[3]["datetime"], "459")
        self.assertEqual(rows[3]["date"], "123")

    def test_serializes_tsv_format(self):
        delimiter = "\t"
        with self.app.test_request_context("/"):
            parsed = csv.DictReader(io.StringIO(self.delimited_content(delimiter)), delimiter=delimiter)
        rows = list(parsed)

        self.assertEqual(rows[0]["datetime"], "26/05/19 12:39")
        self.assertEqual(rows[1]["bool"], "false")
        self.assertEqual(rows[2]["date"], "")
        self.assertEqual(rows[3]["datetime"], "459")


class TestCsvSanitization(TestCase):
    def serialize_data(self, data):
        org = Mock()
        org.get_setting.side_effect = {"date_format": "YYYY-MM-DD", "time_format": "HH:mm"}.get
        with patch("redash.serializers.query_result.current_org", org):
            return serialize_query_result_to_dsv(SimpleNamespace(data=data), ",")

    def test_serializes_embedded_nul_bytes(self):
        nul_data = {
            "rows": [{"name": "foo\x00bar", "ok": "baz"}],
            "columns": [
                {"friendly_name": "name", "type": "string", "name": "name"},
                {"friendly_name": "ok", "type": "string", "name": "ok"},
            ],
        }
        content = self.serialize_data(nul_data)
        rows = list(csv.DictReader(io.StringIO(content)))
        self.assertEqual(rows[0]["name"], "foobar")
        self.assertEqual(rows[0]["ok"], "baz")

    def test_serializes_embedded_nul_in_header_without_losing_values(self):
        data = {
            "rows": [{"first\x00name": "Alice", "other": "Bob"}],
            "columns": [
                {"name": "first\x00name", "type": "string"},
                {"name": "other", "type": "string"},
            ],
        }
        content = self.serialize_data(data)
        self.assertNotIn("\x00", content)
        self.assertEqual(list(csv.reader(io.StringIO(content))), [["firstname", "other"], ["Alice", "Bob"]])

    def test_structured_values_keep_their_existing_representation(self):
        values = [{"nested": "foo\x00bar"}, ["foo\x00bar"]]
        data = {
            "rows": [{"value": value} for value in values],
            "columns": [{"name": "value", "type": "string"}],
        }
        content = self.serialize_data(data)
        self.assertNotIn("\x00", content)
        self.assertEqual(
            [row["value"] for row in csv.DictReader(io.StringIO(content))], [str(value) for value in values]
        )
