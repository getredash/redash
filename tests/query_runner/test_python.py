from datetime import datetime
from unittest import TestCase

import mock

from redash.query_runner.python import Python
from tests import BaseTestCase


class TestPythonQueryRunner(TestCase):
    def setUp(self):
        self.python = Python({})

    @mock.patch("datetime.datetime")
    def test_print_in_query_string_success(self, mock_dt):
        query_string = "print('test')"
        mock_dt.utcnow = mock.Mock(return_value=datetime(1901, 12, 21))
        result = self.python.run_query(query_string, "user")
        self.assertEqual(result[0], {"rows": [], "columns": [], "log": ["[1901-12-21T00:00:00] test"]})

    def test_empty_result(self):
        query_string = "result={}"
        result = self.python.run_query(query_string, "user")
        self.assertEqual(result[0], None)

    def test_none_result(self):
        query_string = "result=None"
        result = self.python.run_query(query_string, "user")
        self.assertEqual(result[0], None)

    def test_invalid_result_type_string(self):
        query_string = "result='string'"
        result = self.python.run_query(query_string, "user")
        self.assertEqual(result[0], None)

    def test_invalid_result_type_int(self):
        query_string = "result=100"
        result = self.python.run_query(query_string, "user")
        self.assertEqual(result[0], None)

    def test_invalid_result_missing_rows(self):
        query_string = "result={'columns': []}"
        result = self.python.run_query(query_string, "user")
        self.assertEqual(result[0], None)

    def test_invalid_result_not_list_rows(self):
        query_string = "result={'rows': {}, 'columns': []}"
        result = self.python.run_query(query_string, "user")
        self.assertEqual(result[0], None)

    def test_invalid_result_missing_columns(self):
        query_string = "result={'rows': []}"
        result = self.python.run_query(query_string, "user")
        self.assertEqual(result[0], None)

    def test_invalid_result_not_list_columns(self):
        query_string = "result={'rows': [], 'columns': {}}"
        result = self.python.run_query(query_string, "user")
        self.assertEqual(result[0], None)

    def test_valid_result_type(self):
        query_string = (
            "result="
            '{"columns": [{"name": "col1", "type": TYPE_STRING},'
            '{"name": "col2", "type": TYPE_INTEGER}],'
            '"rows": [{"col1": "foo", "col2": 100},'
            '{"col1": "bar", "col2": 200}]}'
        )
        result = self.python.run_query(query_string, "user")
        self.assertEqual(
            result[0],
            {
                "columns": [{"name": "col1", "type": "string"}, {"name": "col2", "type": "integer"}],
                "rows": [{"col1": "foo", "col2": 100}, {"col1": "bar", "col2": 200}],
                "log": [],
            },
        )

    @mock.patch("datetime.datetime")
    def test_valid_result_type_with_print(self, mock_dt):
        mock_dt.utcnow = mock.Mock(return_value=datetime(1901, 12, 21))
        query_string = (
            'print("test")\n'
            "result="
            '{"columns": [{"name": "col1", "type": TYPE_STRING},'
            '{"name": "col2", "type": TYPE_INTEGER}],'
            '"rows": [{"col1": "foo", "col2": 100},'
            '{"col1": "bar", "col2": 200}]}'
        )
        result = self.python.run_query(query_string, "user")
        self.assertEqual(
            result[0],
            {
                "columns": [{"name": "col1", "type": "string"}, {"name": "col2", "type": "integer"}],
                "rows": [{"col1": "foo", "col2": 100}, {"col1": "bar", "col2": 200}],
                "log": ["[1901-12-21T00:00:00] test"],
            },
        )

    def test_getattr_cannot_access_private_attributes(self):
        query_string = "getattr((), '__class__')"

        data, error = self.python.run_query(query_string, "user")

        self.assertIsNone(data)
        self.assertIn("__class__", error)

    def test_attribute_assignment_cannot_modify_exposed_objects(self):
        query_string = "get_current_user.compromised = True"

        data, error = self.python.run_query(query_string, "user")

        self.assertIsNone(data)
        self.assertIsNotNone(error)
        self.assertFalse(hasattr(self.python.get_current_user, "compromised"))


class TestPythonQueryRunnerImports(TestCase):
    def run_import(self, allowed_modules, import_statement, expression):
        python = Python({"allowedImportModules": allowed_modules})
        query = "{0}\nresult = {{'rows': [{{'value': {1}}}], 'columns': [{{'name': 'value', 'type': TYPE_STRING}}]}}".format(
            import_statement, expression
        )
        return python.run_query(query, "user")

    def assert_imported(self, allowed_modules, import_statement, expression, value):
        data, error = self.run_import(allowed_modules, import_statement, expression)

        self.assertIsNone(error)
        self.assertEqual([{"value": value}], data["rows"])

    def assert_rejected(self, allowed_modules, import_statement, expression, module_name):
        data, error = self.run_import(allowed_modules, import_statement, expression)

        self.assertIsNone(data)
        self.assertIn("'{0}' is not configured as a supported import module".format(module_name), error)

    def test_import_allowed_module(self):
        self.assert_imported("json", "import json", "json.dumps([1])", "[1]")

    def test_from_submodule_import_name(self):
        self.assert_imported(
            "xml.etree.ElementTree", "from xml.etree.ElementTree import XML", "XML('<tag/>').tag", "tag"
        )

    def test_from_package_import_submodule(self):
        self.assert_imported(
            "xml.etree,xml.etree.ElementTree",
            "from xml.etree import ElementTree",
            "ElementTree.XML('<tag/>').tag",
            "tag",
        )

    def test_from_package_import_attribute_and_submodule(self):
        self.assert_imported(
            "json,json.tool",
            "from json import dumps, tool",
            "dumps([1]) == '[1]' and str(tool).startswith(\"<module 'json.tool'\")",
            True,
        )

    def test_from_package_import_submodule_that_is_allowed_by_its_full_name(self):
        self.assert_imported(
            "json.tool", "from json import tool", "str(tool).startswith(\"<module 'json.tool'\")", True
        )

    def test_from_package_import_name_when_only_its_submodule_is_allowed(self):
        self.assert_rejected("json.tool", "from json import dumps", "dumps([1])", "json")

    def test_import_submodule_binds_the_top_level_package(self):
        self.assert_imported(
            "xml.etree.ElementTree",
            "import xml.etree.ElementTree",
            "xml.etree.ElementTree.XML('<tag/>').tag",
            "tag",
        )

    def test_import_submodule_with_alias(self):
        self.assert_imported(
            "xml.etree.ElementTree", "import xml.etree.ElementTree as et", "et.XML('<tag/>').tag", "tag"
        )

    def test_import_module_that_is_not_allowed(self):
        self.assert_rejected("xml", "import json", "json.dumps([1])", "json")

    def test_import_submodule_of_allowed_package(self):
        self.assert_rejected("xml", "import xml.etree.ElementTree", "1", "xml.etree.ElementTree")

    def test_import_parent_of_allowed_submodule(self):
        self.assert_rejected("xml.etree.ElementTree", "import xml.etree.ElementTree\nimport xml", "1", "xml")

    def test_relative_import_is_not_supported(self):
        data, error = self.run_import("xml", "from . import etree", "1")

        self.assertIsNone(data)
        self.assertIn("relative imports are not supported", error)


class TestPythonQueryRunnerPermissions(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.python = Python({})
        self.python._current_user = self.factory.user

    def test_execute_query_rejects_data_source_without_access(self):
        data_source = self.factory.create_data_source(group=self.factory.create_group())
        self.db.session.flush()

        with self.assertRaisesRegex(Exception, "You do not have access to data source"):
            self.python.execute_query(data_source.id, "SELECT 1")

    def test_execute_query_rejects_view_only_data_source(self):
        data_source = self.factory.create_data_source(group=self.factory.default_group, view_only=True)
        self.db.session.flush()

        with self.assertRaisesRegex(Exception, "You do not have access to data source"):
            self.python.execute_query(data_source.id, "SELECT 1")

    def test_execute_query_requires_current_user(self):
        self.python._current_user = None

        with self.assertRaisesRegex(Exception, "Python query helpers require a current user"):
            self.python.execute_query(self.factory.data_source.id, "SELECT 1")

    def test_execute_query_passes_current_user_to_query_runner(self):
        data_source = self.factory.data_source
        query_runner = mock.Mock()
        query_runner.run_query.return_value = ({"rows": [], "columns": []}, None)

        with mock.patch.object(type(data_source), "query_runner", new_callable=mock.PropertyMock) as runner_property:
            runner_property.return_value = query_runner
            self.python.execute_query(data_source.id, "SELECT 1")

        query_runner.run_query.assert_called_once_with("SELECT 1", self.factory.user)

    def test_execute_query_rejects_ambiguous_data_source_name(self):
        self.factory.create_data_source(name="dup", group=self.factory.default_group)
        self.factory.create_data_source(name="dup", group=self.factory.default_group)
        self.db.session.flush()

        with self.assertRaisesRegex(Exception, "Wrong data source name/id"):
            self.python.execute_query("dup", "SELECT 1")

    def test_get_source_schema_allows_view_only_data_source(self):
        data_source = self.factory.create_data_source(group=self.factory.default_group, view_only=True)
        query_runner = mock.Mock()
        query_runner.get_schema.return_value = {"schema": []}
        self.db.session.flush()

        with mock.patch.object(type(data_source), "query_runner", new_callable=mock.PropertyMock) as runner_property:
            runner_property.return_value = query_runner
            schema = self.python.get_source_schema(data_source.id)

        self.assertEqual({"schema": []}, schema)

    def test_get_source_schema_rejects_data_source_without_access(self):
        data_source = self.factory.create_data_source(group=self.factory.create_group())
        self.db.session.flush()

        with self.assertRaisesRegex(Exception, "You do not have access to data source"):
            self.python.get_source_schema(data_source.id)

    def test_get_query_result_rejects_query_without_data_source_access(self):
        data_source = self.factory.create_data_source(group=self.factory.create_group())
        query_result = self.factory.create_query_result(data_source=data_source)
        query = self.factory.create_query(data_source=data_source, latest_query_data=query_result)
        self.db.session.flush()

        with self.assertRaisesRegex(Exception, "You do not have access to query"):
            self.python.get_query_result(query.id)

    def test_get_query_result_rejects_query_from_another_org(self):
        org = self.factory.create_org()
        data_source = self.factory.create_data_source(org=org, group=org.default_group)
        query_result = self.factory.create_query_result(data_source=data_source)
        query = self.factory.create_query(org=org, data_source=data_source, latest_query_data=query_result)
        self.db.session.flush()

        with self.assertRaisesRegex(Exception, "does not exist"):
            self.python.get_query_result(query.id)

    def test_get_query_result_requires_current_user(self):
        self.python._current_user = None

        with self.assertRaisesRegex(Exception, "Python query helpers require a current user"):
            self.python.get_query_result(1)

    def test_get_query_result_rejects_result_from_inaccessible_data_source(self):
        data_source = self.factory.create_data_source(group=self.factory.create_group())
        query_result = self.factory.create_query_result(data_source=data_source)
        query = self.factory.create_query(latest_query_data=query_result)
        self.db.session.flush()

        with self.assertRaisesRegex(Exception, "You do not have access to query"):
            self.python.get_query_result(query.id)

    def test_get_query_result_allows_view_only_data_source(self):
        data_source = self.factory.create_data_source(group=self.factory.default_group, view_only=True)
        query_result = self.factory.create_query_result(data_source=data_source)
        query = self.factory.create_query(data_source=data_source, latest_query_data=query_result)
        self.db.session.flush()

        self.assertEqual(query_result.data, self.python.get_query_result(query.id))


class TestPython(TestCase):
    def test_sorted_safe_builtins(self):
        src = list(Python.safe_builtins)
        assert src == sorted(src), "Python safe_builtins package not sorted."
