from mock import ANY, patch

from tests import BaseTestCase


@patch("prometheus_client.Histogram.observe")
class TestDatabaseMetrics(BaseTestCase):
    def test_db_request_records_metrics(self, observe):
        self.factory.create_query()
        observe.assert_called_with(ANY)
