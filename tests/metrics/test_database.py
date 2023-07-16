from mock import ANY, patch

from tests import BaseTestCase


@patch("statsd.StatsClient.timing")
class TestDatabaseMetrics(BaseTestCase):
    def test_db_request_records_statsd_metrics(self, timing):
        self.factory.create_query()
        timing.assert_called_with("db.changes.insert", ANY)
