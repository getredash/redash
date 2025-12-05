from mock import patch

from redash.query_runner import NotSupported
from redash.tasks import refresh_schemas
from redash.tasks.queries.maintenance import refresh_schema
from tests import BaseTestCase


class TestRefreshSchemas(BaseTestCase):
    def test_calls_refresh_of_all_data_sources(self):
        self.factory.data_source  # trigger creation
        with patch("redash.tasks.queries.maintenance.refresh_schema.delay") as refresh_job:
            refresh_schemas()
            refresh_job.assert_called()

    def test_skips_paused_data_sources(self):
        self.factory.data_source.pause()

        with patch("redash.tasks.queries.maintenance.refresh_schema.delay") as refresh_job:
            refresh_schemas()
            refresh_job.assert_not_called()

        self.factory.data_source.resume()

        with patch("redash.tasks.queries.maintenance.refresh_schema.delay") as refresh_job:
            refresh_schemas()
            refresh_job.assert_called()

    def test_handles_notsupported_exception(self):
        ds = self.factory.data_source
        with patch.object(ds, "get_schema", side_effect=NotSupported("Schema not supported")):
            with patch("redash.tasks.queries.maintenance.logger") as mock_logger:
                refresh_schema(ds.id)
                mock_logger.debug.assert_called_once()
                mock_logger.warning.assert_not_called()
