import time
from datetime import datetime
from unittest import TestCase

import mock

from redash.query_runner.prometheus import Prometheus, get_instant_rows, get_range_rows


class TestPrometheus(TestCase):
    def setUp(self):
        self.instant_query_result = [
            {
                "metric": {"name": "example_metric_name", "foo_bar": "foo"},
                "value": [1516937400.781, "7400_foo"],
            },
            {
                "metric": {"name": "example_metric_name", "foo_bar": "bar"},
                "value": [1516937400.781, "7400_bar"],
            },
        ]

        self.range_query_result = [
            {
                "metric": {"name": "example_metric_name", "foo_bar": "foo"},
                "values": [[1516937400.781, "7400_foo"], [1516938000.781, "8000_foo"]],
            },
            {
                "metric": {"name": "example_metric_name", "foo_bar": "bar"},
                "values": [[1516937400.781, "7400_bar"], [1516938000.781, "8000_bar"]],
            },
        ]

    def test_get_instant_rows(self):
        instant_rows = [
            {
                "name": "example_metric_name",
                "foo_bar": "foo",
                "timestamp": datetime.fromtimestamp(1516937400.781),
                "value": "7400_foo",
            },
            {
                "name": "example_metric_name",
                "foo_bar": "bar",
                "timestamp": datetime.fromtimestamp(1516937400.781),
                "value": "7400_bar",
            },
        ]

        rows = get_instant_rows(self.instant_query_result)
        self.assertEqual(instant_rows, rows)

    def test_get_range_rows(self):
        range_rows = [
            {
                "name": "example_metric_name",
                "foo_bar": "foo",
                "timestamp": datetime.fromtimestamp(1516937400.781),
                "value": "7400_foo",
            },
            {
                "name": "example_metric_name",
                "foo_bar": "foo",
                "timestamp": datetime.fromtimestamp(1516938000.781),
                "value": "8000_foo",
            },
            {
                "name": "example_metric_name",
                "foo_bar": "bar",
                "timestamp": datetime.fromtimestamp(1516937400.781),
                "value": "7400_bar",
            },
            {
                "name": "example_metric_name",
                "foo_bar": "bar",
                "timestamp": datetime.fromtimestamp(1516938000.781),
                "value": "8000_bar",
            },
        ]

        rows = get_range_rows(self.range_query_result)
        self.assertEqual(range_rows, rows)

    @mock.patch("redash.query_runner.prometheus.datetime")
    def test_get_datetime_now(self, datetime_mock: mock.MagicMock):
        prometheus = Prometheus({"url": "url"})
        datetime_mock.now.return_value = datetime(2023, 12, 12, 11, 00)
        now = prometheus._get_datetime_now()
        self.assertEqual(now, datetime(2023, 12, 12, 11, 00))

    @mock.patch("redash.query_runner.prometheus.Prometheus._create_cert_file")
    def test_get_prometheus_kwargs(self, create_cert_file_mock: mock.MagicMock):
        # 1. case: without ssl attributes
        prometheus = Prometheus({"url": "url"})

        create_cert_file_mock.return_value = None

        prometheus_kwargs = prometheus._get_prometheus_kwargs()

        assert prometheus_kwargs == {
            "verify": True,
            "cert": (),
        }

        create_cert_file_mock.assert_has_calls(
            [mock.call("ca_cert_File"), mock.call("cert_File"), mock.call("cert_key_File")]
        )

        create_cert_file_mock.reset_mock()

        # 2. case: with ssl attributes
        create_cert_file_return_dict = {
            "ca_cert_File": "ca_cert_file.crt",
            "cert_File": "cert_file.crt",
            "cert_key_File": "cert_key_file.key",
        }
        create_cert_file_mock.side_effect = lambda key: create_cert_file_return_dict[key]

        prometheus = Prometheus(
            {
                "url": "url",
                "verify_ssl": True,
                "ca_cert_File": "ca_cert_file",
                "cert_File": "cert_file",
                "cert_key_File": "cert_key_file",
            }
        )

        prometheus_kwargs = prometheus._get_prometheus_kwargs()

        assert prometheus_kwargs == {
            "verify": "ca_cert_file.crt",
            "cert": ("cert_file.crt", "cert_key_file.key"),
        }
        create_cert_file_mock.assert_has_calls(
            [mock.call("ca_cert_File"), mock.call("cert_File"), mock.call("cert_key_File")]
        )

    @mock.patch("redash.query_runner.prometheus.NamedTemporaryFile")
    def test_create_cert_file(self, named_temporary_file_mock: mock.MagicMock):
        # 1. case: with none value
        prometheus = Prometheus({"url": "url"})

        context_manager_mock = named_temporary_file_mock().__enter__()

        cert_file_name = prometheus._create_cert_file("key")

        assert cert_file_name is None
        context_manager_mock.write().assert_not_called()

        named_temporary_file_mock.reset_mock()

        # 2. case: with a valid key
        prometheus = Prometheus({"url": "url", "key": "dmFsdWU="})

        context_manager_mock = named_temporary_file_mock().__enter__()
        context_manager_mock.name = "cert_file_name"

        cert_file_name = prometheus._create_cert_file("key")

        assert cert_file_name == "cert_file_name"
        context_manager_mock.write.assert_called_once_with("value")

    @mock.patch("redash.query_runner.prometheus.os")
    def test_cleanup_cert_files(self, os_mock: mock.MagicMock):
        # 1. case: no file found or verify is bool
        prometheus = Prometheus(
            {
                "url": "url",
                "verify_ssl": True,
                "ca_cert_File": "ca_cert_file",
                "cert_File": "cert_file",
                "cert_key_File": "cert_key_file",
            }
        )

        prometheus._cleanup_cert_files({"verify": True, "cert": ()})

        os_mock.path.exists.assert_not_called()
        os_mock.remove.assert_not_called()

        # 2. case: files found and deleted
        os_mock.path.exists.return_value = True
        prometheus._cleanup_cert_files({"verify": "ca_cert_file", "cert": ("cert_file", "cert_key_file")})

        os_mock.path.exists.assert_has_calls(
            [mock.call("ca_cert_file"), mock.call("cert_file"), mock.call("cert_key_file")]
        )
        os_mock.remove.assert_has_calls(
            [mock.call("ca_cert_file"), mock.call("cert_file"), mock.call("cert_key_file")]
        )

    def test_configuration_schema(self):
        configuration_schema = Prometheus.configuration_schema()
        assert configuration_schema == {
            "type": "object",
            "properties": {
                "url": {"type": "string", "title": "Prometheus API URL"},
                "verify_ssl": {
                    "type": "boolean",
                    "title": "Verify SSL (Ignored, if SSL Root Certificate is given)",
                    "default": True,
                },
                "cert_File": {"type": "string", "title": "SSL Client Certificate", "default": None},
                "cert_key_File": {"type": "string", "title": "SSL Client Key", "default": None},
                "ca_cert_File": {"type": "string", "title": "SSL Root Certificate", "default": None},
            },
            "required": ["url"],
            "secret": ["cert_File", "cert_key_File", "ca_cert_File"],
            "extra_options": ["verify_ssl", "cert_File", "cert_key_File", "ca_cert_File"],
        }

    def test_enabled(self):
        assert Prometheus.enabled() is True

    @mock.patch("redash.query_runner.prometheus.requests.get")
    @mock.patch("redash.query_runner.prometheus.Prometheus._cleanup_cert_files")
    def test_test_connection(
        self,
        cleanup_cert_files_mock: mock.MagicMock,
        requests_get_mock: mock.MagicMock,
    ):
        # 1. case: successful test connection
        prometheus = Prometheus({"url": "url"})
        prometheus_kwargs = {"verify": True, "cert": ()}

        requests_get_mock.get.return_value = mock.Mock(ok=True)

        connected = prometheus.test_connection()

        self.assertTrue(connected)
        requests_get_mock.assert_called_once_with("url", **prometheus_kwargs)
        cleanup_cert_files_mock.assert_called_once_with(prometheus_kwargs)

        cleanup_cert_files_mock.reset_mock()
        requests_get_mock.reset_mock()

        # 2. case: unsuccessful test connection
        prometheus = Prometheus({"url": "url"})
        prometheus_kwargs = {"verify": True, "cert": ()}

        requests_get_mock.return_value = mock.Mock(ok=False)

        connected = prometheus.test_connection()

        self.assertFalse(connected)
        requests_get_mock.assert_called_once_with("url", **prometheus_kwargs)
        cleanup_cert_files_mock.assert_called_once_with(prometheus_kwargs)

        cleanup_cert_files_mock.reset_mock()
        requests_get_mock.reset_mock()

        # 3. case: unsuccessful test connection with raised exception
        prometheus = Prometheus({"url": "url"})
        prometheus_kwargs = {"verify": True, "cert": ()}

        requests_get_mock.side_effect = Exception("test exception")

        with self.assertRaises(Exception) as exception_obj:
            connected = prometheus.test_connection()

        self.assertFalse(connected)
        self.assertEqual(str(exception_obj.exception), "test exception")
        requests_get_mock.assert_called_once_with("url", **prometheus_kwargs)
        cleanup_cert_files_mock.assert_called_once_with(prometheus_kwargs)

    @mock.patch("redash.query_runner.prometheus.requests.get")
    @mock.patch("redash.query_runner.prometheus.Prometheus._cleanup_cert_files")
    def test_get_schema(
        self,
        cleanup_cert_files_mock: mock.MagicMock,
        requests_get_mock: mock.MagicMock,
    ):
        # 1. case: successful get schema
        prometheus = Prometheus({"url": "url"})
        prometheus_kwargs = {"verify": True, "cert": ()}

        requests_get_mock.return_value = mock.Mock(json=mock.Mock(return_value={"data": ["name1", "name2"]}))

        schema = prometheus.get_schema()

        self.assertEqual(schema, [{"name": "name1", "columns": []}, {"name": "name2", "columns": []}])
        requests_get_mock.assert_called_once_with("url/api/v1/label/__name__/values", **prometheus_kwargs)
        cleanup_cert_files_mock.assert_called_once_with(prometheus_kwargs)

        cleanup_cert_files_mock.reset_mock()
        requests_get_mock.reset_mock()

        # 2. case: successful get empty schema
        prometheus = Prometheus({"url": "url"})
        prometheus_kwargs = {"verify": True, "cert": ()}

        requests_get_mock.return_value = mock.Mock(json=mock.Mock(return_value={"data": []}))

        schema = prometheus.get_schema()

        self.assertEqual(schema, [])
        requests_get_mock.assert_called_once_with("url/api/v1/label/__name__/values", **prometheus_kwargs)
        cleanup_cert_files_mock.assert_called_once_with(prometheus_kwargs)

        cleanup_cert_files_mock.reset_mock()
        requests_get_mock.reset_mock()

        # 3. case: unsuccessful get schema with an exception
        prometheus = Prometheus({"url": "url"})
        prometheus_kwargs = {"verify": True, "cert": ()}

        requests_get_mock.side_effect = Exception("test exception")

        with self.assertRaises(Exception) as exception_obj:
            schema = prometheus.get_schema()

        self.assertEqual(schema, [])
        self.assertEqual(str(exception_obj.exception), "test exception")
        requests_get_mock.assert_called_once_with("url/api/v1/label/__name__/values", **prometheus_kwargs)
        cleanup_cert_files_mock.assert_called_once_with(prometheus_kwargs)

    @mock.patch("redash.query_runner.prometheus.requests.get")
    @mock.patch("redash.query_runner.prometheus.Prometheus._cleanup_cert_files")
    def test_run_query(
        self,
        cleanup_cert_files_mock: mock.MagicMock,
        requests_get_mock: mock.MagicMock,
    ):
        # 1. case: successful run instant query
        prometheus = Prometheus({"url": "url"})
        prometheus_kwargs = {"verify": True, "cert": ()}

        timestamp_expected_7400 = datetime.fromtimestamp(1516937400.781)

        rows = [
            {
                "name": "example_metric_name",
                "foo_bar": "foo",
                "timestamp": timestamp_expected_7400,
                "value": "7400_foo",
            },
            {
                "name": "example_metric_name",
                "foo_bar": "bar",
                "timestamp": timestamp_expected_7400,
                "value": "7400_bar",
            },
        ]
        columns = [
            {"friendly_name": "timestamp", "type": "datetime", "name": "timestamp"},
            {"friendly_name": "value", "type": "string", "name": "value"},
            {"friendly_name": "name", "type": "string", "name": "name"},
            {"friendly_name": "foo_bar", "type": "string", "name": "foo_bar"},
        ]

        data_expected = {"rows": rows, "columns": columns}

        requests_get_mock.return_value = mock.Mock(
            json=mock.Mock(return_value={"data": {"result": self.instant_query_result}})
        )

        data, error = prometheus.run_query("http_requests_total", "user")

        self.assertEqual(data, data_expected)
        self.assertIsNone(error)
        requests_get_mock.assert_called_once_with(
            "url/api/v1/query", params={"query": ["http_requests_total"]}, **prometheus_kwargs
        )
        cleanup_cert_files_mock.assert_called_once_with(prometheus_kwargs)

        cleanup_cert_files_mock.reset_mock()
        requests_get_mock.reset_mock()

        # 2. case: successful run instant query with empty result
        prometheus = Prometheus({"url": "url"})
        prometheus_kwargs = {"verify": True, "cert": ()}

        requests_get_mock.return_value = mock.Mock(json=mock.Mock(return_value={"data": {"result": []}}))

        data, error = prometheus.run_query("http_requests_total", "user")

        self.assertIsNone(data)
        self.assertEqual(error, "query result is empty.")
        requests_get_mock.assert_called_once_with(
            "url/api/v1/query", params={"query": ["http_requests_total"]}, **prometheus_kwargs
        )
        cleanup_cert_files_mock.assert_called_once_with(prometheus_kwargs)

        cleanup_cert_files_mock.reset_mock()
        requests_get_mock.reset_mock()

        # 3. case: successful run range query with start and end
        prometheus = Prometheus({"url": "url"})
        prometheus_kwargs = {"verify": True, "cert": ()}
        timestamp_expected_8000 = datetime.fromtimestamp(1516938000.781)

        rows = [
            {
                "name": "example_metric_name",
                "foo_bar": "foo",
                "timestamp": timestamp_expected_7400,
                "value": "7400_foo",
            },
            {
                "name": "example_metric_name",
                "foo_bar": "foo",
                "timestamp": timestamp_expected_8000,
                "value": "8000_foo",
            },
            {
                "name": "example_metric_name",
                "foo_bar": "bar",
                "timestamp": timestamp_expected_7400,
                "value": "7400_bar",
            },
            {
                "name": "example_metric_name",
                "foo_bar": "bar",
                "timestamp": timestamp_expected_8000,
                "value": "8000_bar",
            },
        ]
        columns = [
            {"friendly_name": "timestamp", "type": "datetime", "name": "timestamp"},
            {"friendly_name": "value", "type": "string", "name": "value"},
            {"friendly_name": "name", "type": "string", "name": "name"},
            {"friendly_name": "foo_bar", "type": "string", "name": "foo_bar"},
        ]

        data_expected = {"rows": rows, "columns": columns}

        requests_get_mock.return_value = mock.Mock(
            json=mock.Mock(return_value={"data": {"result": self.range_query_result}})
        )

        start_timestamp_expected = int(time.mktime(datetime(2018, 1, 26).timetuple()))
        end_timestamp_expected = int(time.mktime(datetime(2018, 1, 27).timetuple()))
        data, error = prometheus.run_query(
            "http_requests_total&start=2018-01-26T00:00:00.000Z&end=2018-01-27T00:00:00.000Z&step=60s", "user"
        )

        self.assertEqual(data, data_expected)
        self.assertIsNone(error)
        requests_get_mock.assert_called_once_with(
            "url/api/v1/query_range",
            params={
                "query": ["http_requests_total"],
                "start": [start_timestamp_expected],
                "end": [end_timestamp_expected],
                "step": ["60s"],
            },
            **prometheus_kwargs,
        )
        cleanup_cert_files_mock.assert_called_once_with(prometheus_kwargs)

        cleanup_cert_files_mock.reset_mock()
        requests_get_mock.reset_mock()

        # 4. case: successful run range query with start and without end
        prometheus = Prometheus({"url": "url"})
        prometheus_kwargs = {"verify": True, "cert": ()}

        rows = [
            {
                "name": "example_metric_name",
                "foo_bar": "foo",
                "timestamp": timestamp_expected_7400,
                "value": "7400_foo",
            },
            {
                "name": "example_metric_name",
                "foo_bar": "foo",
                "timestamp": timestamp_expected_8000,
                "value": "8000_foo",
            },
            {
                "name": "example_metric_name",
                "foo_bar": "bar",
                "timestamp": timestamp_expected_7400,
                "value": "7400_bar",
            },
            {
                "name": "example_metric_name",
                "foo_bar": "bar",
                "timestamp": timestamp_expected_8000,
                "value": "8000_bar",
            },
        ]
        columns = [
            {"friendly_name": "timestamp", "type": "datetime", "name": "timestamp"},
            {"friendly_name": "value", "type": "string", "name": "value"},
            {"friendly_name": "name", "type": "string", "name": "name"},
            {"friendly_name": "foo_bar", "type": "string", "name": "foo_bar"},
        ]

        data_expected = {"rows": rows, "columns": columns}

        now_datetime = datetime(2023, 12, 12, 11, 00, 00)
        end_timestamp_expected = int(time.mktime(now_datetime.timetuple()))

        requests_get_mock.return_value = mock.Mock(
            json=mock.Mock(return_value={"data": {"result": self.range_query_result}})
        )

        with mock.patch("redash.query_runner.prometheus.Prometheus._get_datetime_now") as get_datetime_now_mock:
            get_datetime_now_mock.return_value = now_datetime
            data, error = prometheus.run_query("http_requests_total&start=2018-01-26T00:00:00.000Z&step=60s", "user")

        self.assertEqual(data, data_expected)
        self.assertIsNone(error)
        requests_get_mock.assert_called_once_with(
            "url/api/v1/query_range",
            params={
                "query": ["http_requests_total"],
                "start": [start_timestamp_expected],
                "end": [end_timestamp_expected],
                "step": ["60s"],
            },
            **prometheus_kwargs,
        )
        cleanup_cert_files_mock.assert_called_once_with(prometheus_kwargs)

        cleanup_cert_files_mock.reset_mock()
        requests_get_mock.reset_mock()
        data = None
        error = None

        # 5. case: run query with exception
        prometheus = Prometheus({"url": "url"})
        prometheus_kwargs = {"verify": True, "cert": ()}

        requests_get_mock.side_effect = Exception("test exception")

        with self.assertRaises(Exception) as exception_obj:
            data, error = prometheus.run_query("http_requests_total", "user")

        self.assertIsNone(data)
        self.assertIsNone(error)
        self.assertEqual(str(exception_obj.exception), "test exception")
        requests_get_mock.assert_called_once_with(
            "url/api/v1/query", params={"query": ["http_requests_total"]}, **prometheus_kwargs
        )
        cleanup_cert_files_mock.assert_called_once_with(prometheus_kwargs)
