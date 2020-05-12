from mock import patch, ANY
from tests import BaseTestCase


@patch("statsd.StatsClient.timing")
class TestRequestMetrics(BaseTestCase):
    def test_flask_request_records_statsd_metrics(self, timing):
        self.factory.create_query()
        timing.assert_called_once_with("db.queries.Insert", ANY)
