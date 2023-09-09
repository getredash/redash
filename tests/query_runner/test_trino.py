"""
Some test cases for Trino.
"""
import re
from unittest import TestCase
from unittest.mock import Mock, patch

from redash.query_runner.trino import Trino


class TestTrino(TestCase):
    @patch("redash.query_runner.trino.trino")
    @patch.object(Trino, "run_query")
    def test_get_schema_no_catalog_set(self, mock_run_query, mock_trino):
        def side_effect_run_query(query):
            catalog_query_regex = "SHOW CATALOGS"
            schema_query_regex = "SELECT.*information_schema"
            if query.strip().match(catalog_query_regex, re.IGNORE_CASE) is not None:
                return ('{"rows": [{"Catalog": "hive"}]}', None)
            elif query.strip().match(schema_query_regex, re.IGNORE_CASE) is not None:
                return (
                    '{"rows": [{"table_schema": "public", "table_name": "users", "column_name": "id", "data_type": "integer"}]}',
                    None,
                )
            return (None, "Unknown query")

        # Mocking the response from run_query method
        mock_run_query.return_value = side_effect_run_query

        # Mocking the trino module's constants and exceptions
        mock_trino.constants.DEFAULT_AUTH = Mock()
        mock_trino.exceptions.DatabaseError = Exception

        # Creating an instance of Trino class
        runner = Trino({})

        # Calling the get_schema method
        schema = runner.get_schema()

        # Verifying the output
        expected_schema = [{"name": "hive.public.users", "columns": [{"name": "id", "type": "integer"}]}]
        self.assertEqual(schema, expected_schema)
