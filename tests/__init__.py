import logging
from unittest import TestCase
from redash import settings
settings.DATABASE_CONFIG = {
    'name': 'circle_test',
    'threadlocals': True
}

from redash import models

logging.getLogger('peewee').setLevel(logging.INFO)


class BaseTestCase(TestCase):
    def setUp(self):
        models.create_db(True, True)
        models.init_db()

    def tearDown(self):
        models.db.close_db(None)
        models.create_db(False, True)