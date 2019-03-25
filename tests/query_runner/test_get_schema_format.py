import json
import mock

from unittest import TestCase

from redash.query_runner.presto import Presto
from redash.query_runner.athena import Athena
from redash.query_runner.mysql import Mysql
from redash.query_runner.pg import PostgreSQL, Redshift


class TestBaseQueryRunner(TestCase):
    def setUp(self):
        self.query_runners = [
            {"instance": Presto({}), "mock_location": "presto.Presto"},
            {"instance": Athena({}), "mock_location": "athena.Athena"},
            {"instance": Mysql({"db": None}), "mock_location": "mysql.Mysql"},
            {"instance": PostgreSQL({}), "mock_location": "pg.PostgreSQL"},
            {"instance": Redshift({}), "mock_location": "pg.Redshift"},
        ]

    def _setup_mock(self, function_to_patch):
        patcher = mock.patch(function_to_patch)
        patched_function = patcher.start()
        self.addCleanup(patcher.stop)
        return patched_function

    def assert_correct_schema_format(self, query_runner, mock_location):
        EXPECTED_SCHEMA_RESULT = [
            {
                "columns": ["created_date"],
                "metadata": [{"name": "created_date", "type": "varchar",}],
                "name": "default.table_name",
            }
        ]

        get_schema_query_response = {
            "rows": [
                {
                    "table_schema": "default",
                    "table_name": "table_name",
                    "column_type": "varchar",
                    "column_name": "created_date",
                }
            ]
        }
        get_samples_query_response = {"rows": [{"created_date": "2017-10-26"}]}

        self.run_count = 0

        def query_runner_resonses(query, user):
            response = (json.dumps(get_schema_query_response), None)
            if self.run_count > 0:
                response = (json.dumps(get_samples_query_response), None)
            self.run_count += 1
            return response

        self.patched_run_query = self._setup_mock(
            "redash.query_runner.{location}.run_query".format(location=mock_location)
        )
        self.patched_run_query.side_effect = query_runner_resonses

        schema = query_runner.get_schema()
        self.assertEqual(schema, EXPECTED_SCHEMA_RESULT)

    def test_get_schema_format(self):
        for runner in self.query_runners:
            self.assert_correct_schema_format(
                runner["instance"], runner["mock_location"]
            )
