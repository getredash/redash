from redash import settings as settings
from unittest import TestCase


class TestDatabaseUrlParser(TestCase):
    def test_only_database_name(self):
        config = settings.parse_db_url("postgresql://postgres")
        self.assertEquals(config['name'], 'postgres')

    def test_host_and_database_name(self):
        config = settings.parse_db_url("postgresql://localhost/postgres")
        self.assertEquals(config['name'], 'postgres')
        self.assertEquals(config['host'], 'localhost')

    def test_host_with_port_and_database_name(self):
        config = settings.parse_db_url("postgresql://localhost:5432/postgres")
        self.assertEquals(config['name'], 'postgres')
        self.assertEquals(config['host'], 'localhost')
        self.assertEquals(config['port'], 5432)

    def test_full_url(self):
        config = settings.parse_db_url("postgresql://user:pass@localhost:5432/postgres")
        self.assertEquals(config['name'], 'postgres')
        self.assertEquals(config['host'], 'localhost')
        self.assertEquals(config['port'], 5432)
        self.assertEquals(config['user'], 'user')
        self.assertEquals(config['password'], 'pass')
