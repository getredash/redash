from unittest import TestCase
from redash import settings, db, app, models

settings.DATABASE_CONFIG = {
    'name': 'rd_test',
    'engine': 'peewee.PostgresqlDatabase',
    'threadlocals': True
}
app.config['DATABASE'] = settings.DATABASE_CONFIG
db.load_database()


class DatabaseTestCase(TestCase):
    def setUp(self):
        models.create_db(True, True)

    def tearDown(self):
        models.create_db(False, True)


class DashboardTest(DatabaseTestCase):
    def test_appends_suffix_to_slug_when_duplicate(self):
        d1 = models.Dashboard.create(name='test', user='arik', layout='')
        self.assertEquals(d1.slug, 'test')

        d2 = models.Dashboard.create(name='test', user='arik', layout='')
        self.assertNotEquals(d1.slug, d2.slug)

        d3 = models.Dashboard.create(name='test', user='arik', layout='')
        self.assertNotEquals(d1.slug, d3.slug)
        self.assertNotEquals(d2.slug, d3.slug)