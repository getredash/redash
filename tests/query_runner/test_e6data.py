from unittest.mock import patch

from redash.query_runner.e6data import e6data

runner = e6data(
    {
        "username": "test_user",
        "password": "test_password",
        "host": "abc",
        "port": 80,
        "catalog": "test_catalog",
        "database": "test_database",
    }
)


@patch("e6data_python_connector.Connection.get_tables")
@patch("e6data_python_connector.Connection.get_columns")
def test_get_schema(mock_get_columns, mock_get_tables):
    mock_get_tables.return_value = ["table1", "table2"]
    mock_get_columns.side_effect = [
        [{"fieldName": "id", "fieldType": "INT"}, {"fieldName": "name", "fieldType": "STRING"}],
        [{"fieldName": "age", "fieldType": "INT"}, {"fieldName": "city", "fieldType": "STRING"}],
    ]

    schema = runner.get_schema()

    expected_schema = [
        {"name": "table1", "columns": [{"name": "id", "type": "INT"}, {"name": "name", "type": "STRING"}]},
        {"name": "table2", "columns": [{"name": "age", "type": "INT"}, {"name": "city", "type": "STRING"}]},
    ]

    assert schema == expected_schema
