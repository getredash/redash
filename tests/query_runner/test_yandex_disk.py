from io import BytesIO
from unittest import mock

import pandas as pd
import pytest

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

test_token = "AAAAQAA"


def test_yandex_disk_type():
    assert YandexDisk.type() == "yandex_disk"


def test_yandex_disk_name():
    assert YandexDisk.name() == "Yandex Disk"


@mock.patch("requests.get")
def test__send_query(mock_requests_get):
    mock_requests_get.return_value.ok = True
    mock_requests_get.return_value.json.return_value = {"foo": "bar"}

    configuration = {"token": test_token}
    disk = YandexDisk(configuration)
    response = disk._send_query("test_url")

    assert response == {"foo": "bar"}
    mock_requests_get.assert_called_once()


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


def test_read_xlsx():
    output = BytesIO()
    writer = pd.ExcelWriter(output)
    test_df.to_excel(writer, index=False)
    writer.save()
    assert test_df.equals(EXTENSIONS_READERS["xlsx"](output))


def test_read_csv():
    output = BytesIO()
    test_df.to_csv(output, index=False)
    output.seek(0)

    assert test_df.equals(EXTENSIONS_READERS["csv"](output))


def test_tsv():
    output = BytesIO()
    test_df.to_csv(output, index=False, sep="\t")
    output.seek(0)

    assert test_df.equals(EXTENSIONS_READERS["tsv"](output))
