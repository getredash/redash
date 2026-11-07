from unittest import TestCase, mock

import redis

from redash.utils.redis_version import UnsupportedRedisVersion, check_redis_version


def connection_running(version):
    connection = mock.Mock()
    connection.info.return_value = {"redis_version": version}
    return connection


class TestCheckRedisVersion(TestCase):
    def test_accepts_supported_versions(self):
        for version in ["5.0.0", "6.2.14", "7.4.2", "8.0.0"]:
            check_redis_version(connection_running(version))

    def test_rejects_older_versions(self):
        for version in ["3.2.12", "4.0.14"]:
            with self.assertRaisesRegex(
                UnsupportedRedisVersion, f"requires Redis 5.0 or later.*running Redis {version}"
            ):
                check_redis_version(connection_running(version))

    def test_ignores_disabled_info_command(self):
        connection = mock.Mock()
        connection.info.side_effect = redis.ResponseError("unknown command 'INFO'")
        with self.assertLogs("redash.utils.redis_version", level="WARNING"):
            check_redis_version(connection)
