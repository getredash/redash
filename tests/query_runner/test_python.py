from datetime import datetime
import mock
from unittest import TestCase

from redash.query_runner.python import Python


class TestPythonQueryRunner(TestCase):

    def setUp(self):
        self.python = Python({"allowedImportModules": "pandas"})

    @mock.patch('datetime.datetime')
    def test_print_in_query_string_success(self, mock_dt):
        query_string = "print('test')"
        mock_dt.utcnow = mock.Mock(return_value=datetime(1901, 12, 21))
        result = self.python.run_query(query_string, 'user')
        self.assertEqual(result[0],
                         '{"rows": [], "columns": [], "log": ["[1901-12-21T00:00:00] test"]}')

    def test_empty_result(self):
        query_string = "result={}"
        result = self.python.run_query(query_string, 'user')
        self.assertEqual(result[0],
                         '{"log": []}')

    def test_invalidate_result_type_string(self):
        query_string = "result='string'"
        result = self.python.run_query(query_string, 'user')
        self.assertEqual(result[0], None)

    def test_invalidate_result_type_int(self):
        query_string = "result=100"
        result = self.python.run_query(query_string, 'user')
        self.assertEqual(result[0], None)

    def test_validate_result_type(self):
        query_string = 'result=' \
                       '{"columns": [{"name": "col1", "type": TYPE_STRING},' \
                       '{"name": "col2", "type": TYPE_INTEGER}],' \
                       '"rows": [{"col1": "foo", "col2": 100},' \
                       '{"col1": "bar", "col2": 200}]}'
        result = self.python.run_query(query_string, 'user')
        self.assertEqual(result[0], '{"columns": [{"name": "col1", "type": "string"},'
                                    ' {"name": "col2", "type": "integer"}],'
                                    ' "rows": [{"col1": "foo", "col2": 100},'
                                    ' {"col1": "bar", "col2": 200}],'
                                    ' "log": []}')

    @mock.patch('datetime.datetime')
    def test_validate_result_type_with_print(self, mock_dt):
        mock_dt.utcnow = mock.Mock(return_value=datetime(1901, 12, 21))
        query_string = 'print("test")\n' \
                       'result=' \
                       '{"columns": [{"name": "col1", "type": TYPE_STRING},' \
                       '{"name": "col2", "type": TYPE_INTEGER}],' \
                       '"rows": [{"col1": "foo", "col2": 100},' \
                       '{"col1": "bar", "col2": 200}]}'
        result = self.python.run_query(query_string, 'user')
        self.assertEqual(result[0], '{"columns": [{"name": "col1", "type": "string"},'
                                    ' {"name": "col2", "type": "integer"}],'
                                    ' "rows": [{"col1": "foo", "col2": 100},'
                                    ' {"col1": "bar", "col2": 200}],'
                                    ' "log": ["[1901-12-21T00:00:00] test"]}')

    def test_dataframe_result_type(self):
        query_string = 'def get_result():\n' \
                       '    import pandas as pd\n' \
                       '    return pd.DataFrame({"col1": [1, 2], "col2": ["foo", "bar"]})\n' \
                       'df = get_result()\n' \
                       'result=df_to_redash(df)'

        result = self.python.run_query(query_string, 'user')
        self.assertEqual(result[0], '{"columns": [{"name": "col1", "friendly_name": "col1", "type": "integer"},'
                                    ' {"name": "col2", "friendly_name": "col2", "type": "string"}],'
                                    ' "rows": [{"col1": 1, "col2": "foo"},'
                                    ' {"col1": 2, "col2": "bar"}],'
                                    ' "log": []}')
        
        
class TestPython(TestCase):
    def test_sorted_safe_builtins(self):
        src = list(Python.safe_builtins)
        assert src == sorted(src), "Python safe_builtins package not sorted."
