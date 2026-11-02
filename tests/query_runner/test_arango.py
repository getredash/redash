from unittest import TestCase

import mock

from redash.query_runner.arango import Arango

CONFIGURATION = {"host": "http://localhost", "user": "root", "password": "pwd", "dbname": "db", "timeout": 30}


@mock.patch("redash.query_runner.arango.ArangoClient")
class TestArango(TestCase):
    def test_no_http_request_timeout(self, arango_client):
        arango_client.return_value.db.return_value.aql.execute.return_value = [{"a": 1}]

        Arango(CONFIGURATION).run_query("FOR d IN c RETURN d", None)

        arango_client.assert_called_once_with(hosts="http://localhost:8529", request_timeout=None)

    def test_run_query(self, arango_client):
        aql = arango_client.return_value.db.return_value.aql
        aql.execute.return_value = [{"a": 1, "b": "x"}]

        data, error = Arango(CONFIGURATION).run_query("FOR d IN c RETURN d", None)

        self.assertIsNone(error)
        aql.execute.assert_called_once_with("FOR d IN c RETURN d", max_runtime=30)
        self.assertEqual(["a", "b"], [c["name"] for c in data["columns"]])
        self.assertEqual([{"a": 1, "b": "x"}], data["rows"])
