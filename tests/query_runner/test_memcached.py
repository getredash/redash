from unittest import TestCase

import mock

from redash.query_runner.memcached import Memcached


class TestMemcached(TestCase):
    @mock.patch("redash.query_runner.memcached.PooledClient")
    def test_test_connection(self, memcached_client_mock: mock.MagicMock):
        memcached_client = memcached_client_mock.return_value
        memcached_client.get.return_value = "test_connection_value"
        memcached_client.set.return_value = True
        memcached_client.delete.return_value = True

        memcached = Memcached({"host": "localhost", "port": "11211"})

        memcached.test_connection()
        memcached_client.set.assert_called_once_with("test_connection_key", "test_connection_value")
        memcached_client.get.assert_called_once_with("test_connection_key")
        memcached_client.delete.assert_called_once_with("test_connection_key")

    @mock.patch("redash.query_runner.memcached.HashClient")
    def test_test_connection_cluster(self, memcached_client_mock: mock.MagicMock):
        memcached_client = memcached_client_mock.return_value
        memcached_client.get.return_value = "test_connection_value"
        memcached_client.set.return_value = True
        memcached_client.delete.return_value = True

        memcached = Memcached({"host": "localhost", "port": "11211", "is_cluster": True})

        memcached.test_connection()
        memcached_client.set.assert_called_once_with("test_connection_key", "test_connection_value")
        memcached_client.get.assert_called_once_with("test_connection_key")
        memcached_client.delete.assert_called_once_with("test_connection_key")
