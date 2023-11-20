from io import BytesIO
from unittest import mock

import yaml

from redash.query_runner.yandex_disk import enabled
from redash.utils import json_dumps

if enabled:
    import pandas as pd

    from redash.query_runner.yandex_disk import EXTENSIONS_READERS, YandexDisk

    test_df = pd.DataFrame(
        [
            {"id": 1, "name": "Alice", "age": 20},
            {"id": 2, "name": "Bob", "age": 21},
            {"id": 3, "name": "Charlie", "age": 22},
            {"id": 4, "name": "Dave", "age": 23},
            {"id": 5, "name": "Eve", "age": 24},
        ]
    )


import pytest

test_token = "AAAAQAA"
skip_condition = pytest.mark.skipif(not enabled, reason="pandas and/or openpyxl are not installed")


@pytest.fixture
def mock_yandex_disk():
    return YandexDisk(configuration={"token": test_token})


@skip_condition
def test_yandex_disk_type():
    assert YandexDisk.type() == "yandex_disk"


@skip_condition
def test_yandex_disk_name():
    assert YandexDisk.name() == "Yandex Disk"


@skip_condition
@mock.patch("requests.get")
def test__send_query(mock_requests_get):
    mock_requests_get.return_value.ok = True
    mock_requests_get.return_value.json.return_value = {"foo": "bar"}

    configuration = {"token": test_token}
    disk = YandexDisk(configuration)
    response = disk._send_query("test_url")

    assert response == {"foo": "bar"}
    mock_requests_get.assert_called_once()


@skip_condition
@pytest.mark.parametrize(
    "configuration, error_message",
    [({"token": test_token}, None), ({"token": ""}, "Code: 400, message: Unauthorized")],
)
@mock.patch("requests.get")
def test_test_connection(mock_requests_get, configuration, error_message):
    if error_message:
        mock_requests_get.return_value.ok = False
        mock_requests_get.return_value.status_code = 400
        mock_requests_get.return_value.text = "Unauthorized"
    else:
        mock_requests_get.return_value.ok = True

    disk = YandexDisk(configuration)
    if error_message:
        with pytest.raises(Exception, match=error_message):
            disk.test_connection()
    else:
        assert disk.test_connection() is None


@skip_condition
def test_get_tables(mock_yandex_disk):
    mock_files = {
        "items": [
            {"name": "test_file.csv", "path": "disk:/test_path/test_file.csv"},
            {"name": "invalid_file.txt", "path": "disk:/test_path/invalid_file.txt"},
        ]
    }
    mock_yandex_disk._send_query = mock.MagicMock(return_value=mock_files)

    tables = mock_yandex_disk._get_tables({})
    assert len(tables) == 1
    assert tables[0]["name"] == "test_file.csv"
    assert tables[0]["columns"] == ["/test_path/test_file.csv"]


def mock_ext_readers_return(url, **params):
    return test_df


@skip_condition
@mock.patch("requests.get")
def test_run_query(mocked_requests, mock_yandex_disk):
    mocked_response = mock.MagicMock()
    mocked_response.ok = True
    mocked_response.json.return_value = {"href": "test_file.csv"}
    mocked_requests.return_value = mocked_response

    mock_readers = EXTENSIONS_READERS.copy()
    mock_readers["csv"] = mock_ext_readers_return

    expected_data = json_dumps(
        {
            "columns": [
                {"name": "id", "friendly_name": "id", "type": "integer"},
                {"name": "name", "friendly_name": "name", "type": "string"},
                {"name": "age", "friendly_name": "age", "type": "integer"},
            ],
            "rows": [
                {"id": 1, "name": "Alice", "age": 20},
                {"id": 2, "name": "Bob", "age": 21},
                {"id": 3, "name": "Charlie", "age": 22},
                {"id": 4, "name": "Dave", "age": 23},
                {"id": 5, "name": "Eve", "age": 24},
            ],
        }
    )

    with mock.patch.dict("redash.query_runner.yandex_disk.EXTENSIONS_READERS", mock_readers, clear=True):
        data, error = mock_yandex_disk.run_query(yaml.dump({"path": "/tmp/file.csv"}), "user")

    assert error is None
    assert data == expected_data


@skip_condition
def test_read_xlsx():
    output = BytesIO()
    writer = pd.ExcelWriter(output)
    test_df.to_excel(writer, index=False)
    writer.save()
    assert test_df.equals(EXTENSIONS_READERS["xlsx"](output))


@skip_condition
def test_read_csv():
    output = BytesIO()
    test_df.to_csv(output, index=False)
    output.seek(0)

    assert test_df.equals(EXTENSIONS_READERS["csv"](output))


@skip_condition
def test_tsv():
    output = BytesIO()
    test_df.to_csv(output, index=False, sep="\t")
    output.seek(0)

    assert test_df.equals(EXTENSIONS_READERS["tsv"](output))
