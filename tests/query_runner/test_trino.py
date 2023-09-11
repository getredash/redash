"""
Some test cases for Trino.
"""
import re
from unittest import TestCase
from unittest.mock import patch

from redash.query_runner.trino import Trino


class TestTrino(TestCase):
    catalog_name = "memory"
    schema_name = "default"
    table_name = "users"
    column_name = "id"
    column_type = "integer"

    @staticmethod
    def side_effect_run_query(query, user):
        catalog_query_pattern = r"\s*SHOW\s+CATALOGS\s*"
        schema_query_pattern = r"""
        \s*SELECT\s+table_schema,\s+table_name,\s+column_name,\s+data_type
        \s+FROM\s+(\w+\.)?information_schema\.columns
        \s+WHERE\s+table_schema\s+NOT\s+IN\s+\('pg_catalog',\s+'information_schema'\)\s*
        """
        if re.search(catalog_query_pattern, query, re.IGNORECASE) is not None:
            return (f'{{"rows": [{{"Catalog": "{TestTrino.catalog_name}"}}]}}', None)
        elif re.search(schema_query_pattern, query, re.IGNORECASE) is not None:
            return (
                f'{{"rows": [{{"table_schema": "{TestTrino.schema_name}", "table_name": "{TestTrino.table_name}", "column_name": "{TestTrino.column_name}", "data_type": "{TestTrino.column_type}"}}]}}',
                None,
            )
        return (None, "Unknown query")

    @patch.object(Trino, "run_query")
    def test_get_schema_no_catalog_set(self, mock_run_query):
        mock_run_query.side_effect = self.side_effect_run_query
        runner = Trino({})
        schema = runner.get_schema()
        expected_schema = [
            {
                "name": f"{TestTrino.catalog_name}.{TestTrino.schema_name}.{TestTrino.table_name}",
                "columns": [{"name": f"{TestTrino.column_name}", "type": f"{TestTrino.column_type}"}],
            }
        ]
        self.assertEqual(schema, expected_schema)

    @patch.object(Trino, "run_query")
    def test_get_schema_catalog_set(self, mock_run_query):
        mock_run_query.side_effect = self.side_effect_run_query
        runner = Trino({"catalog": TestTrino.catalog_name})
        schema = runner.get_schema()
        expected_schema = [
            {
                "name": f"{TestTrino.schema_name}.{TestTrino.table_name}",
                "columns": [{"name": f"{TestTrino.column_name}", "type": f"{TestTrino.column_type}"}],
            }
        ]
        self.assertEqual(schema, expected_schema)
