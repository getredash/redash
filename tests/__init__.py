import logging
from unittest import TestCase
from redash import settings, db, app
import redash.models

# TODO: this isn't pretty...
settings.DATABASE_CONFIG = {
    'name': 'circle_test',
    'engine': 'peewee.PostgresqlDatabase',
    'threadlocals': True
}
app.config['DATABASE'] = settings.DATABASE_CONFIG
db.load_database()

logging.getLogger('peewee').setLevel(logging.INFO)

for model in redash.models.all_models:
    model._meta.database = db.database


class BaseTestCase(TestCase):
    def setUp(self):
        redash.models.create_db(True, True)

    def tearDown(self):
        db.close_db(None)
        redash.models.create_db(False, True)