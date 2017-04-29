import datetime
from mock import patch, call, ANY
from tests import BaseTestCase
from redash.tasks import refresh_schemas


class TestRefreshSchemas(BaseTestCase):
    def test_calls_refresh_of_all_data_sources(self):
        self.factory.data_source # trigger creation
        with patch('redash.models.DataSource.get_schema') as get_schema:
            refresh_schemas()
            get_schema.assert_called_with(refresh=True)

    def test_skips_paused_data_sources(self):
        self.factory.data_source.pause()

        with patch('redash.models.DataSource.get_schema') as get_schema:
            refresh_schemas()
            get_schema.assert_not_called()

        self.factory.data_source.resume()

        with patch('redash.models.DataSource.get_schema') as get_schema:
            refresh_schemas()
            get_schema.assert_called_with(refresh=True)
