from tests import BaseTestCase
from redash.models import DataSource


class TestDataSourceCreate(BaseTestCase):
    def test_adds_data_source_to_default_group(self):
        data_source = DataSource.create(org=self.factory.org, name='test', options='{}', type='pg')
        self.assertIn(self.factory.org.default_group.id, data_source.groups)
