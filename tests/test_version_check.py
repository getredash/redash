from unittest import TestCase
from unittest.mock import patch

from redash import version_check


@patch.object(version_check, "redis_connection")
class TestCompareAndUpdate(TestCase):
    def test_newer_release_is_stored(self, redis_connection):
        with patch.object(version_check, "current_version", "26.9.0-dev"):
            version_check._compare_and_update("26.10.0")
        redis_connection.set.assert_called_once_with(version_check.REDIS_KEY, "26.10.0")

    def test_dev_snapshot_is_older_than_its_release(self, redis_connection):
        with patch.object(version_check, "current_version", "26.9.0-dev"):
            version_check._compare_and_update("26.9.0")
        redis_connection.set.assert_called_once_with(version_check.REDIS_KEY, "26.9.0")

    def test_same_version_clears_flag(self, redis_connection):
        with patch.object(version_check, "current_version", "26.9.0"):
            version_check._compare_and_update("26.9.0")
        redis_connection.set.assert_not_called()
        redis_connection.delete.assert_called_once_with(version_check.REDIS_KEY)
