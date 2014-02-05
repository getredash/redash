from unittest import TestCase
from redash import settings, db, app
import redash.models

# TODO: this isn't pretty... :-)
settings.DATABASE_CONFIG = {
    'name': 'rd_test',
    'engine': 'peewee.PostgresqlDatabase',
    'threadlocals': True
}
app.config['DATABASE'] = settings.DATABASE_CONFIG
db.load_database()


def model_factory(model, **kwargs):
    def factory(**properties):
        kwargs.update(properties)

        return model(**kwargs)

    return factory


class ModelFactory(object):
    def __init__(self, model, **kwargs):
        self.model = model
        self.kwargs = kwargs

    def _get_kwargs(self, override_kwargs):
        kwargs = self.kwargs.copy()
        kwargs.update(override_kwargs)
        return kwargs

    def instance(self, **override_kwargs):
        kwargs = self._get_kwargs(override_kwargs)

        return self.model(**kwargs)

    def create(self, **override_kwargs):
        kwargs = self._get_kwargs(override_kwargs)

        return self.model.create(**kwargs)

DashboardFactory = ModelFactory(redash.models.Dashboard,
                                name='test', user='test@everything.me', layout='[]')

dashboard_factory = model_factory(redash.models.Dashboard, name='test', user='test@everything.me', layout='[]')


class BaseTestCase(TestCase):
    def setUp(self):
        redash.models.create_db(True, True)

    def tearDown(self):
        db.close_db(None)
        redash.models.create_db(False, True)