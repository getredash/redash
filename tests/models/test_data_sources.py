from tests import BaseTestCase
from redash.models import DataSource
from redash.utils.configuration import ConfigurationContainer


class TestDataSourceCreate(BaseTestCase):
    def test_adds_data_source_to_default_group(self):
        data_source = DataSource.create_with_group(org=self.factory.org, name='test', options=ConfigurationContainer.from_json('{"dbname": "test"}'), type='pg')
        self.assertIn(self.factory.org.default_group.id, data_source.groups)


class TestDataSourceIsPaused(BaseTestCase):
    def test_returns_false_by_default(self):
        self.assertFalse(self.factory.data_source.paused)

    def test_persists_selection(self):
        self.factory.data_source.pause()
        self.assertTrue(self.factory.data_source.paused)

        self.factory.data_source.resume()
        self.assertFalse(self.factory.data_source.paused)

    def test_allows_setting_reason(self):
        reason = "Some good reason."
        self.factory.data_source.pause(reason)
        self.assertTrue(self.factory.data_source.paused)
        self.assertEqual(self.factory.data_source.pause_reason, reason)

    def test_resume_clears_reason(self):
        self.factory.data_source.pause("Reason")
        self.factory.data_source.resume()
        self.assertEqual(self.factory.data_source.pause_reason, None)

    def test_reason_is_none_by_default(self):
        self.assertEqual(self.factory.data_source.pause_reason, None)
