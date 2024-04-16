from mock import ANY, patch

from tests import BaseTestCase


@patch("prometheus_client.Histogram.observe")
class TestRequestMetrics(BaseTestCase):
    def test_flask_request_records_metrics(self, observe):
        self.client.get("/ping")
        observe.assert_called_once_with(ANY)
