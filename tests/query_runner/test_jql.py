from unittest import TestCase

from redash.query_runner.jql import FieldMapping, parse_issue


class TestFieldMapping(TestCase):
    def test_empty(self):
        field_mapping = FieldMapping({})

        self.assertEqual(field_mapping.get_output_field_name("field1"), "field1")
        self.assertEqual(field_mapping.get_dict_output_field_name("field1", "member1"), None)
        self.assertEqual(field_mapping.get_dict_members("field1"), [])

    def test_with_mappings(self):
        field_mapping = FieldMapping(
            {
                "field1": "output_name_1",
                "field2.member1": "output_name_2",
                "field2.member2": "output_name_3",
            }
        )

        self.assertEqual(field_mapping.get_output_field_name("field1"), "output_name_1")
        self.assertEqual(field_mapping.get_dict_output_field_name("field1", "member1"), None)
        self.assertEqual(field_mapping.get_dict_members("field1"), [])

        self.assertEqual(field_mapping.get_output_field_name("field2"), "field2")
        self.assertEqual(
            field_mapping.get_dict_output_field_name("field2", "member1"),
            "output_name_2",
        )
        self.assertEqual(
            field_mapping.get_dict_output_field_name("field2", "member2"),
            "output_name_3",
        )
        self.assertEqual(field_mapping.get_dict_output_field_name("field2", "member3"), None)
        self.assertEqual(field_mapping.get_dict_members("field2"), ["member1", "member2"])


class TestParseIssue(TestCase):
    issue = {
        "key": "KEY-1",
        "fields": {
            "string_field": "value1",
            "int_field": 123,
            "string_list_field": ["value1", "value2"],
            "dict_field": {"member1": "value1", "member2": "value2"},
            "dict_list_field": [
                {"member1": "value1a", "member2": "value2a"},
                {"member1": "value1b", "member2": "value2b"},
            ],
            "dict_legacy": {
                "key": "legacyKey",
                "name": "legacyName",
                "dict_legacy": "legacyValue",
            },
            "watchers": {"watchCount": 10},
        },
    }

    def test_no_mapping(self):
        result = parse_issue(self.issue, FieldMapping({}))

        self.assertEqual(result["key"], "KEY-1")
        self.assertEqual(result["string_field"], "value1")
        self.assertEqual(result["int_field"], 123)
        self.assertEqual(result["string_list_field"], "value1,value2")
        self.assertEqual("dict_field" in result, False)
        self.assertEqual("dict_list_field" in result, False)
        self.assertEqual(result["dict_legacy"], "legacyValue")
        self.assertEqual(result["dict_legacy_key"], "legacyKey")
        self.assertEqual(result["dict_legacy_name"], "legacyName")
        self.assertEqual(result["watchers"], 10)

    def test_mapping(self):
        result = parse_issue(
            self.issue,
            FieldMapping(
                {
                    "string_field": "string_output_field",
                    "string_list_field": "string_output_list_field",
                    "dict_field.member1": "dict_field_1",
                    "dict_field.member2": "dict_field_2",
                    "dict_list_field.member1": "dict_list_field_1",
                    "dict_legacy.key": "dict_legacy",
                    "watchers.watchCount": "watchCount",
                }
            ),
        )

        self.assertEqual(result["key"], "KEY-1")
        self.assertEqual(result["string_output_field"], "value1")
        self.assertEqual(result["int_field"], 123)
        self.assertEqual(result["string_output_list_field"], "value1,value2")
        self.assertEqual(result["dict_field_1"], "value1")
        self.assertEqual(result["dict_field_2"], "value2")
        self.assertEqual(result["dict_list_field_1"], "value1a,value1b")
        self.assertEqual(result["dict_legacy"], "legacyKey")
        self.assertEqual("dict_legacy_key" in result, False)
        self.assertEqual("dict_legacy_name" in result, False)
        self.assertEqual("watchers" in result, False)
        self.assertEqual(result["watchCount"], 10)

    def test_mapping_nonexisting_field(self):
        result = parse_issue(
            self.issue,
            FieldMapping(
                {
                    "non_existing_field": "output_name1",
                    "dict_field.non_existing_member": "output_name2",
                    "dict_list_field.non_existing_member": "output_name3",
                }
            ),
        )

        self.assertEqual(result["key"], "KEY-1")
        self.assertEqual(result["string_field"], "value1")
        self.assertEqual(result["int_field"], 123)
        self.assertEqual(result["string_list_field"], "value1,value2")
        self.assertEqual("dict_field" in result, False)
        self.assertEqual("dict_list_field" in result, False)
        self.assertEqual(result["dict_legacy"], "legacyValue")
        self.assertEqual(result["dict_legacy_key"], "legacyKey")
        self.assertEqual(result["dict_legacy_name"], "legacyName")
        self.assertEqual(result["watchers"], 10)
