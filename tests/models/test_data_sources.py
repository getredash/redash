from tests import BaseTestCase
from redash.models import DataSource
from redash.utils.configuration import ConfigurationContainer


class TestDataSourceCreate(BaseTestCase):
    def test_adds_data_source_to_default_group(self):
        data_source = DataSource.create_with_group(org=self.factory.org, name='test', options=ConfigurationContainer.from_json('{"dbname": "test"}'), type='pg')
        self.assertIn(self.factory.org.default_group.id, data_source.groups)
