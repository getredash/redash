from unittest import TestCase
from unittest.mock import MagicMock, patch

from redash.query_runner import TYPE_BOOLEAN, TYPE_FLOAT, TYPE_INTEGER, TYPE_STRING
from redash.query_runner.dynamodb_sql import DynamoDBSQL


def _runner(config=None):
    config = config or {
        "region": "us-east-1",
        "aws_access_key": "ak",
        "aws_secret_key": "sk",
    }
    return DynamoDBSQL(config)


@patch("redash.query_runner.dynamodb_sql.boto3")
class TestDynamoDBSQLRunQuery(TestCase):
    def test_run_query_empty_returns_error(self, mock_boto3):
        runner = _runner()
        data, error = runner.run_query("", None)
        self.assertIsNone(data)
        self.assertEqual(error, "Query is empty.")
        mock_boto3.client.assert_not_called()

    def test_run_query_simple_select(self, mock_boto3):
        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client
        mock_client.execute_statement.return_value = {
            "Items": [
                {"id": {"S": "1"}, "name": {"S": "Alice"}, "score": {"N": "42"}},
                {"id": {"S": "2"}, "name": {"S": "Bob"}, "score": {"N": "100"}},
            ]
        }

        runner = _runner()
        data, error = runner.run_query('SELECT * FROM "MyTable"', None)

        self.assertIsNone(error)
        self.assertEqual(
            data["columns"],
            [
                {"name": "id", "friendly_name": "id", "type": TYPE_STRING},
                {"name": "name", "friendly_name": "name", "type": TYPE_STRING},
                {"name": "score", "friendly_name": "score", "type": TYPE_INTEGER},
            ],
        )
        self.assertEqual(
            data["rows"],
            [
                {"id": "1", "name": "Alice", "score": 42},
                {"id": "2", "name": "Bob", "score": 100},
            ],
        )
        mock_client.execute_statement.assert_called_once_with(Statement='SELECT * FROM "MyTable"')

    def test_run_query_strips_trailing_semicolon(self, mock_boto3):
        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client
        mock_client.execute_statement.return_value = {"Items": []}

        runner = _runner()
        runner.run_query('SELECT * FROM "MyTable";', None)

        mock_client.execute_statement.assert_called_once_with(Statement='SELECT * FROM "MyTable"')

    def test_run_query_pagination(self, mock_boto3):
        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client
        mock_client.execute_statement.side_effect = [
            {"Items": [{"a": {"S": "1"}}], "NextToken": "token1"},
            {"Items": [{"a": {"S": "2"}}], "NextToken": "token2"},
            {"Items": [{"a": {"S": "3"}}]},
        ]

        runner = _runner()
        data, error = runner.run_query('SELECT * FROM "T"', None)

        self.assertIsNone(error)
        self.assertEqual(len(data["rows"]), 3)
        self.assertEqual([r["a"] for r in data["rows"]], ["1", "2", "3"])
        self.assertEqual(mock_client.execute_statement.call_count, 3)
        self.assertEqual(
            mock_client.execute_statement.call_args_list[1][1]["NextToken"],
            "token1",
        )
        self.assertEqual(
            mock_client.execute_statement.call_args_list[2][1]["NextToken"],
            "token2",
        )

    def test_run_query_error_returns_message(self, mock_boto3):
        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client
        mock_client.execute_statement.side_effect = Exception("ResourceNotFoundException")

        runner = _runner()
        data, error = runner.run_query('SELECT * FROM "BadTable"', None)

        self.assertIsNone(data)
        self.assertIn("ResourceNotFoundException", error)

    def test_run_query_empty_items_returns_empty_columns_and_rows(self, mock_boto3):
        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client
        mock_client.execute_statement.return_value = {"Items": []}

        runner = _runner()
        data, error = runner.run_query('SELECT * FROM "EmptyTable"', None)

        self.assertIsNone(error)
        self.assertEqual(data["columns"], [])
        self.assertEqual(data["rows"], [])


@patch("redash.query_runner.dynamodb_sql.boto3")
class TestDynamoDBSQLTypeDeserialization(TestCase):
    def test_types_string_number_int_bool(self, mock_boto3):
        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client
        mock_client.execute_statement.return_value = {
            "Items": [
                {
                    "s": {"S": "hello"},
                    "n_int": {"N": "42"},
                    "n_float": {"N": "3.14"},
                    "b": {"BOOL": True},
                }
            ]
        }

        runner = _runner()
        data, error = runner.run_query('SELECT * FROM "T"', None)

        self.assertIsNone(error)
        cols = {c["name"]: c["type"] for c in data["columns"]}
        self.assertEqual(cols["s"], TYPE_STRING)
        self.assertEqual(cols["n_int"], TYPE_INTEGER)
        self.assertEqual(cols["n_float"], TYPE_FLOAT)
        self.assertEqual(cols["b"], TYPE_BOOLEAN)
        row = data["rows"][0]
        self.assertEqual(row["s"], "hello")
        self.assertEqual(row["n_int"], 42)
        self.assertEqual(row["n_float"], 3.14)
        self.assertEqual(row["b"], True)

    def test_complex_types_serialized_as_json(self, mock_boto3):
        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client
        mock_client.execute_statement.return_value = {
            "Items": [
                {
                    "m": {"M": {"x": {"S": "y"}}},
                    "l": {"L": [{"S": "a"}, {"N": "1"}]},
                }
            ]
        }

        runner = _runner()
        data, error = runner.run_query('SELECT * FROM "T"', None)

        self.assertIsNone(error)
        row = data["rows"][0]
        self.assertIsInstance(row["m"], str)
        self.assertIn("x", row["m"])
        self.assertIn("y", row["m"])
        self.assertIsInstance(row["l"], str)
        self.assertIn("a", row["l"])


@patch("redash.query_runner.dynamodb_sql.boto3")
class TestDynamoDBSQLGetSchema(TestCase):
    def test_get_schema_lists_tables_and_attributes(self, mock_boto3):
        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client
        mock_client.get_paginator.return_value.paginate.return_value = [
            {"TableNames": ["Table1", "Table2"]}
        ]
        mock_client.describe_table.side_effect = [
            {
                "Table": {
                    "AttributeDefinitions": [
                        {"AttributeName": "pk", "AttributeType": "S"},
                        {"AttributeName": "sk", "AttributeType": "N"},
                    ]
                }
            },
            {
                "Table": {
                    "AttributeDefinitions": [
                        {"AttributeName": "id", "AttributeType": "S"},
                    ]
                }
            },
        ]

        runner = _runner()
        schema = runner.get_schema()

        self.assertEqual(
            schema,
            [
                {"name": "Table1", "columns": ["pk", "sk"]},
                {"name": "Table2", "columns": ["id"]},
            ],
        )

    def test_get_schema_swallows_describe_error(self, mock_boto3):
        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client
        mock_client.get_paginator.return_value.paginate.return_value = [
            {"TableNames": ["GoodTable", "BadTable"]}
        ]
        mock_client.describe_table.side_effect = [
            {"Table": {"AttributeDefinitions": [{"AttributeName": "pk", "AttributeType": "S"}]}},
            Exception("AccessDenied"),
        ]

        runner = _runner()
        schema = runner.get_schema()

        self.assertEqual(
            schema,
            [
                {"name": "GoodTable", "columns": ["pk"]},
                {"name": "BadTable", "columns": []},
            ],
        )


@patch("redash.query_runner.dynamodb_sql.boto3")
class TestDynamoDBSQLTestConnection(TestCase):
    def test_test_connection_calls_list_tables(self, mock_boto3):
        mock_client = MagicMock()
        mock_boto3.client.return_value = mock_client

        runner = _runner()
        runner.test_connection()

        mock_client.list_tables.assert_called_once_with(Limit=1)


class TestDynamoDBSQLConfiguration(TestCase):
    def test_type(self):
        self.assertEqual(DynamoDBSQL.type(), "dynamodb_sql")

    def test_name(self):
        self.assertEqual(DynamoDBSQL.name(), "Amazon DynamoDB")

    def test_configuration_schema_required(self):
        schema = DynamoDBSQL.configuration_schema()
        self.assertEqual(schema["required"], ["region", "aws_access_key", "aws_secret_key"])
        self.assertIn("region", schema["properties"])
        self.assertIn("aws_access_key", schema["properties"])
        self.assertIn("aws_secret_key", schema["properties"])
        self.assertIn("endpoint_url", schema["properties"])

    def test_client_uses_endpoint_url_when_provided(self):
        with patch("redash.query_runner.dynamodb_sql.boto3") as mock_boto3:
            runner = _runner({
                "region": "us-east-1",
                "aws_access_key": "ak",
                "aws_secret_key": "sk",
                "endpoint_url": "http://localhost:8000",
            })
            runner._get_client()
            mock_boto3.client.assert_called_once()
            call_kw = mock_boto3.client.call_args[1]
            self.assertEqual(call_kw["endpoint_url"], "http://localhost:8000")

    def test_client_ignores_blank_endpoint_url(self):
        with patch("redash.query_runner.dynamodb_sql.boto3") as mock_boto3:
            runner = _runner({
                "region": "us-east-1",
                "aws_access_key": "ak",
                "aws_secret_key": "sk",
                "endpoint_url": "   ",
            })
            runner._get_client()
            call_kw = mock_boto3.client.call_args[1]
            self.assertNotIn("endpoint_url", call_kw)
