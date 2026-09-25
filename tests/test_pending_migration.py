from unittest import mock

from redash.pending_migration import pending_migration_check
from tests import BaseTestCase


class TestPendingMigrationCheck(BaseTestCase):
    def setUp(self):
        super().setUp()
        # The hook is skipped while `app.testing` is set (see pending_migration.py),
        # which is how every other test avoids it. Flip it off just for this class,
        # and reset the checker's cached state so tests don't leak into each other.
        self.app.config["TESTING"] = False
        pending_migration_check._up_to_date = False
        pending_migration_check._pending = False
        pending_migration_check._last_checked_at = 0.0
        self.addCleanup(self._reset)

    def _reset(self):
        self.app.config["TESTING"] = True
        pending_migration_check._up_to_date = False
        pending_migration_check._pending = False
        pending_migration_check._last_checked_at = 0.0

    @mock.patch("redash.pending_migration.is_database_up_to_date", return_value=False)
    def test_blocks_requests_while_migrations_are_pending(self, _):
        rv = self.client.get("/status.json")
        self.assertEqual(rv.status_code, 503)

    @mock.patch("redash.pending_migration.is_database_up_to_date", return_value=True)
    def test_allows_requests_once_up_to_date(self, _):
        rv = self.client.get("/status.json")
        self.assertNotEqual(rv.status_code, 503)

    @mock.patch("redash.pending_migration.is_database_up_to_date", return_value=False)
    def test_exempts_the_health_check_endpoint(self, _):
        rv = self.client.get("/ping")
        self.assertEqual(rv.status_code, 200)

    @mock.patch("redash.pending_migration.is_database_up_to_date")
    def test_does_not_recheck_once_confirmed_up_to_date(self, mocked_check):
        mocked_check.return_value = True
        self.client.get("/status.json")
        self.client.get("/status.json")
        self.assertEqual(mocked_check.call_count, 1)

    @mock.patch("redash.pending_migration.is_database_up_to_date")
    def test_fails_open_when_the_check_itself_errors(self, mocked_check):
        mocked_check.side_effect = Exception("boom")
        rv = self.client.get("/status.json")
        self.assertNotEqual(rv.status_code, 503)

    @mock.patch("redash.pending_migration.is_database_up_to_date", return_value=False)
    def test_does_not_exempt_paths_that_merely_start_with_ping(self, _):
        rv = self.client.get("/pingfoo")
        self.assertEqual(rv.status_code, 503)

    @mock.patch("redash.pending_migration.is_database_up_to_date")
    def test_keeps_blocking_within_the_recheck_interval(self, mocked_check):
        mocked_check.return_value = False
        self.client.get("/status.json")
        rv = self.client.get("/status.json")
        self.assertEqual(rv.status_code, 503)
        self.assertEqual(mocked_check.call_count, 1)

    @mock.patch("redash.pending_migration.is_database_up_to_date")
    def test_stays_open_within_the_recheck_interval_after_an_error(self, mocked_check):
        mocked_check.side_effect = Exception("boom")
        self.client.get("/status.json")
        rv = self.client.get("/status.json")
        self.assertNotEqual(rv.status_code, 503)
        self.assertEqual(mocked_check.call_count, 1)
