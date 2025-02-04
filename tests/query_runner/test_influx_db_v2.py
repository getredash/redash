import mock
import pytest
from influxdb_client.client.flux_table import (
    FluxColumn,
    FluxRecord,
    FluxTable,
    TableList,
)

from redash.query_runner.influx_db_v2 import InfluxDBv2


@pytest.fixture()
def influx_table_list():
    tables = TableList()
    table_1 = FluxTable()
    table_2 = FluxTable()
    column_1 = FluxColumn(index=0, label="col_1", data_type="string", group=False, default_value="default_value_2")
    column_2 = FluxColumn(index=0, label="col_2", data_type="integer", group=False, default_value="default_value_2")
    column_3 = FluxColumn(index=1, label="col_3", data_type="float", group=False, default_value=3.0)

    record_1 = FluxRecord(table_1, values={"col_1": "col_value_1", "col_2": 1})
    record_1.table = column_1.index
    record_1.row = ["col_value_1", 1, "field_1", "value_1"]

    record_2 = FluxRecord(table_1, values={"col_1": "col_value_2", "col_2": 2})
    record_2.table = column_1.index
    record_2.row = ["col_value_2", 2, "field_2", "value_2"]

    record_3 = FluxRecord(table_2, values={"col_3": 3.0})
    record_3.table = column_1.index
    record_3.row = ["col_value_1", 1, "field_1", "value_1"]

    table_1.columns = [column_1, column_2]
    table_1.records = [record_1, record_2]

    table_2.columns = [column_3]
    table_2.records = [record_3]

    tables.append(table_1)
    tables.append(table_2)

    return tables


class TestInfluxDBv2:
    @mock.patch("redash.query_runner.influx_db_v2.InfluxDBv2." "_create_cert_file")
    def test_get_influx_kwargs(self, create_cert_file_mock: mock.MagicMock):
        # 1. case: without ssl attributes
        influx_db_v2 = InfluxDBv2({"url": "url", "token": "token", "org": "org"})

        create_cert_file_mock.return_value = None

        influx_kwargs = influx_db_v2._get_influx_kwargs()

        assert influx_kwargs == {
            "verify_ssl": None,
            "cert_file": None,
            "cert_key_file": None,
            "cert_key_password": None,
            "ssl_ca_cert": None,
        }

        create_cert_file_mock.assert_has_calls(
            [mock.call("cert_File"), mock.call("cert_key_File"), mock.call("ssl_ca_cert_File")]
        )

        create_cert_file_mock.reset_mock()

        # 2. case: with ssl attributes
        create_cert_file_return_dict = {
            "cert_File": "cert_file.crt",
            "cert_key_File": "cert_key_file.key",
            "ssl_ca_cert_File": "ssl_ca_cert_file.crt",
        }
        create_cert_file_mock.side_effect = lambda key: create_cert_file_return_dict[key]

        influx_db_v2 = InfluxDBv2(
            {
                "url": "url",
                "token": "token",
                "org": "org",
                "verify_ssl": True,
                "cert_File": "cert_file",
                "cert_key_File": "cert_key_file",
                "cert_key_password": "cert_key_password",
                "ssl_ca_cert_File": "ssl_ca_cert_file",
            }
        )

        influx_kwargs = influx_db_v2._get_influx_kwargs()

        assert influx_kwargs == {
            "verify_ssl": True,
            "cert_file": "cert_file.crt",
            "cert_key_file": "cert_key_file.key",
            "cert_key_password": "cert_key_password",
            "ssl_ca_cert": "ssl_ca_cert_file.crt",
        }
        create_cert_file_mock.assert_has_calls(
            [mock.call("cert_File"), mock.call("cert_key_File"), mock.call("ssl_ca_cert_File")]
        )

    @mock.patch("redash.query_runner.influx_db_v2.NamedTemporaryFile")
    def test_create_cert_file(self, named_temporary_file_mock: mock.MagicMock):
        # 1. case: with none value
        influx_db_v2 = InfluxDBv2({"url": "url", "token": "token", "org": "org"})

        context_manager_mock = named_temporary_file_mock().__enter__()

        cert_file_name = influx_db_v2._create_cert_file("key")

        assert cert_file_name is None
        context_manager_mock.write().assert_not_called()

        named_temporary_file_mock.reset_mock()

        # 2. case: with a valid key
        influx_db_v2 = InfluxDBv2({"url": "url", "token": "token", "org": "org", "key": "dmFsdWU="})

        context_manager_mock = named_temporary_file_mock().__enter__()
        context_manager_mock.name = "cert_file_name"

        cert_file_name = influx_db_v2._create_cert_file("key")

        assert cert_file_name == "cert_file_name"
        context_manager_mock.write.assert_called_once_with("value")

    @mock.patch("redash.query_runner.influx_db_v2.os")
    def test_cleanup_cert_files(self, os_mock: mock.MagicMock):
        # 1. case: no file found
        influx_db_v2 = InfluxDBv2(
            {
                "url": "url",
                "token": "token",
                "org": "org",
                "verify_ssl": True,
                "cert_File": "cert_file",
                "cert_key_File": "cert_key_file",
                "cert_key_password": "cert_key_password",
                "ssl_ca_cert_File": "ssl_ca_cert_file",
            }
        )

        influx_db_v2._cleanup_cert_files({"any_file": "any_file"})

        os_mock.path.exists.assert_not_called()
        os_mock.remove.assert_not_called()

        # 2. case: file found and deleted
        os_mock.path.exists.return_value = True
        influx_db_v2._cleanup_cert_files({"cert_file": "cert_file"})

        os_mock.path.exists.assert_called_once_with("cert_file")
        os_mock.remove.assert_called_once_with("cert_file")

    def test_configuration_schema(self):
        configuration_schema = InfluxDBv2.configuration_schema()
        assert configuration_schema == {
            "type": "object",
            "properties": {
                "url": {"type": "string", "title": "URL"},
                "org": {"type": "string", "title": "Organization"},
                "token": {"type": "string", "title": "Token"},
                "verify_ssl": {"type": "boolean", "title": "Verify SSL", "default": False},
                "cert_File": {"type": "string", "title": "SSL Client Certificate", "default": None},
                "cert_key_File": {"type": "string", "title": "SSL Client Key", "default": None},
                "cert_key_password": {"type": "string", "title": "Password for SSL Client Key", "default": None},
                "ssl_ca_cert_File": {"type": "string", "title": "SSL Root Certificate", "default": None},
            },
            "order": ["url", "org", "token", "cert_File", "cert_key_File", "cert_key_password", "ssl_ca_cert_File"],
            "required": ["url", "org", "token"],
            "secret": ["token", "cert_File", "cert_key_File", "cert_key_password", "ssl_ca_cert_File"],
            "extra_options": ["verify_ssl", "cert_File", "cert_key_File", "cert_key_password", "ssl_ca_cert_File"],
        }

    def test_enabled(self):
        assert InfluxDBv2.enabled() is True

    @mock.patch("redash.query_runner.influx_db_v2.InfluxDBClient")
    @mock.patch("redash.query_runner.influx_db_v2.InfluxDBv2." "_cleanup_cert_files")
    @mock.patch("redash.query_runner.influx_db_v2.logger")
    def test_test_connection(
        self,
        logger_mock: mock.MagicMock,
        cleanup_cert_files_mock: mock.MagicMock,
        influx_db_client_mock: mock.MagicMock,
    ):
        # 1. case: successful test connection
        influx_db_v2 = InfluxDBv2({"url": "url", "token": "token", "org": "org"})
        influx_kwargs = {
            "verify_ssl": None,
            "cert_file": None,
            "cert_key_file": None,
            "cert_key_password": None,
            "ssl_ca_cert": None,
        }

        health_mock = influx_db_client_mock.return_value.__enter__().health
        health_mock.return_value = mock.MagicMock(status="pass")

        influx_db_v2.test_connection()

        influx_db_client_mock.assert_called_once_with(url="url", token="token", org="org", **influx_kwargs)
        health_mock.assert_called_once()
        cleanup_cert_files_mock.assert_called_once_with(influx_kwargs)
        logger_mock.error.assert_not_called()

        cleanup_cert_files_mock.reset_mock()
        influx_db_client_mock.reset_mock()

        # 2. case: unsuccessful test connection
        influx_db_v2 = InfluxDBv2({"url": "url", "token": "token", "org": "org"})
        influx_kwargs = {
            "verify_ssl": None,
            "cert_file": None,
            "cert_key_file": None,
            "cert_key_password": None,
            "ssl_ca_cert": None,
        }

        health_mock = influx_db_client_mock.return_value.__enter__().health
        health_mock.return_value = mock.MagicMock(status="fail", message="Connection failed.")

        with pytest.raises(Exception) as exp:
            influx_db_v2.test_connection()

        assert str(exp.value) == "InfluxDB is not healthy. Check logs for more information."
        influx_db_client_mock.assert_called_once_with(url="url", token="token", org="org", **influx_kwargs)
        health_mock.assert_called_once()
        cleanup_cert_files_mock.assert_called_once_with(influx_kwargs)
        logger_mock.error.assert_called_once_with("Connection test failed, due to: 'Connection failed.'.")

    def test_get_type(self):
        influx_db_v2 = InfluxDBv2(
            {
                "url": "url",
                "token": "token",
                "org": "org",
            }
        )

        assert influx_db_v2._get_type("integer") == "integer"
        assert influx_db_v2._get_type("long") == "integer"
        assert influx_db_v2._get_type("float") == "float"
        assert influx_db_v2._get_type("double") == "float"
        assert influx_db_v2._get_type("boolean") == "boolean"
        assert influx_db_v2._get_type("string") == "string"
        assert influx_db_v2._get_type("datetime:RFC3339") == "datetime"

    def test_get_data_from_tables(self, influx_table_list: TableList):
        # 1. case: get object with coulmns and rows
        influx_db_v2 = InfluxDBv2(
            {
                "url": "url",
                "token": "token",
                "org": "org",
            }
        )

        data = influx_db_v2._get_data_from_tables(influx_table_list)
        assert data == {
            "columns": [
                {"friendly_name": "Col_1", "name": "col_1", "type": "string"},
                {"friendly_name": "Col_2", "name": "col_2", "type": "integer"},
                {"friendly_name": "Col_3", "name": "col_3", "type": "float"},
            ],
            "rows": [{"col_1": "col_value_1", "col_2": 1}, {"col_1": "col_value_2", "col_2": 2}, {"col_3": 3.0}],
        }

        # 2. case: get empty object without coulmns and rows
        data = influx_db_v2._get_data_from_tables(TableList())
        assert data == {"columns": [], "rows": []}

    @mock.patch("redash.query_runner.influx_db_v2.InfluxDBClient")
    @mock.patch("redash.query_runner.influx_db_v2.InfluxDBv2." "_cleanup_cert_files")
    @mock.patch("redash.query_runner.influx_db_v2.logger")
    def test_run_query(
        self,
        logger_mock: mock.MagicMock,
        cleanup_cert_files_mock: mock.MagicMock,
        influx_db_client_mock: mock.MagicMock,
        influx_table_list: TableList,
    ):
        influx_db_v2 = InfluxDBv2(
            {
                "url": "url",
                "token": "token",
                "org": "org",
            }
        )
        influx_kwargs = {
            "verify_ssl": None,
            "cert_file": None,
            "cert_key_file": None,
            "cert_key_password": None,
            "ssl_ca_cert": None,
        }
        query = 'from(bucket: "test")' "|> range(start: 2023-12-04T09:00:00.000Z, " "stop: 2023-12-04T15:00:00.000Z)"

        result_data = {
            "columns": [
                {"friendly_name": "Col_1", "name": "col_1", "type": "string"},
                {"friendly_name": "Col_2", "name": "col_2", "type": "integer"},
                {"friendly_name": "Col_3", "name": "col_3", "type": "float"},
            ],
            "rows": [{"col_1": "col_value_1", "col_2": 1}, {"col_1": "col_value_2", "col_2": 2}, {"col_3": 3.0}],
        }

        query_mock = influx_db_client_mock.return_value.__enter__().query_api().query
        query_mock.return_value = influx_table_list

        # 1. case: successful query data
        data, error = influx_db_v2.run_query(query, "user")

        assert data == result_data
        assert error is None

        influx_db_client_mock.assert_called_once_with(url="url", token="token", org="org", **influx_kwargs)
        logger_mock.debug.assert_called_once_with(f"InfluxDB got query: {query!r}")
        query_mock.assert_called_once_with(query)
        cleanup_cert_files_mock.assert_called_once_with(influx_kwargs)

        influx_db_client_mock.reset_mock()
        logger_mock.reset_mock()
        query_mock.reset_mock()
        cleanup_cert_files_mock.reset_mock()

        # 2. case: unsuccessful query data
        query_mock.side_effect = Exception("test error")
        data, error = influx_db_v2.run_query(query, "user")

        assert data is None
        assert error == "test error"

        influx_db_client_mock.assert_called_once_with(url="url", token="token", org="org", **influx_kwargs)
        logger_mock.debug.assert_called_once_with(f"InfluxDB got query: {query!r}")
        query_mock.assert_called_once_with(query)
        cleanup_cert_files_mock.assert_called_once_with(influx_kwargs)
