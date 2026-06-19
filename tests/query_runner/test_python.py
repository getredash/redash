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
