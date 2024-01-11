from unittest.mock import patch

from redash.query_runner import TYPE_INTEGER, TYPE_STRING
from redash.query_runner.e6data import e6data

runner = e6data(
    {
        "username": "test_user",
        "password": "test_password",
        "host": "test_host",
        "port": 80,
        "catalog": "test_catalog",
        "database": "test_database",
    }
)


@patch("e6data_python_connector.e6data_grpc.Cursor")
def test_run_query(mock_cursor):
    query = "SELECT * FROM test_table"
    user = None
    mock_cursor.return_value.fetchall.return_value = [[1, "John"]]
    mock_cursor.return_value.description = [
        ("id", "INT", None, None, None, None, True),
        ("name", "STRING", None, None, None, None, True),
    ]

    json_data, error = runner.run_query(query, user)

    expected_json_data = {
        "columns": [
            {"name": "id", "type": TYPE_INTEGER},
            {"name": "name", "type": TYPE_STRING},
        ],
        "rows": [{"id": 1, "name": "John"}],
    }

    assert json_data == expected_json_data


@patch("e6data_python_connector.e6data_grpc.Cursor")
def test_test_connection(mock_cursor):
    query = "SELECT 1"
    user = None
    mock_cursor.return_value.fetchall.return_value = [[1]]
    mock_cursor.return_value.description = [("EXPR$0", "INTEGER", None, None, None, None, True)]

    json_data, error = runner.run_query(query, user)

    expected_json_data = {"columns": [{"name": "EXPR$0", "type": TYPE_INTEGER}], "rows": [{"EXPR$0": 1}]}

    assert json_data == expected_json_data


@patch("e6data_python_connector.Connection.get_tables")
@patch("e6data_python_connector.Connection.get_columns")
def test_get_schema(mock_get_columns, mock_get_tables):
    mock_get_tables.return_value = ["table1", "table2"]
    mock_get_columns.side_effect = [
        [
            {"fieldName": "id", "fieldType": "INT"},
            {"fieldName": "name", "fieldType": "STRING"},
        ],
        [
            {"fieldName": "age", "fieldType": "INT"},
            {"fieldName": "city", "fieldType": "STRING"},
        ],
    ]

    schema = runner.get_schema()

    expected_schema = [
        {
            "name": "table1",
            "columns": [
                {"name": "id", "type": TYPE_INTEGER},
                {"name": "name", "type": TYPE_STRING},
            ],
        },
        {
            "name": "table2",
            "columns": [
                {"name": "age", "type": TYPE_INTEGER},
                {"name": "city", "type": TYPE_STRING},
            ],
        },
    ]

    assert schema == expected_schema
