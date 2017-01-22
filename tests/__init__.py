import os
import logging
import datetime
import json
from unittest import TestCase
from contextlib import contextmanager

os.environ['REDASH_REDIS_URL'] = os.environ.get('REDASH_REDIS_URL', "redis://localhost:6379/0").replace("/0", "/5")
# Use different url for Celery to avoid DB being cleaned up:
os.environ['REDASH_CELERY_BROKER'] = os.environ.get('REDASH_REDIS_URL', "redis://localhost:6379/0").replace("/5", "/6")

# Dummy values for oauth login
os.environ['REDASH_GOOGLE_CLIENT_ID'] = "dummy"
os.environ['REDASH_GOOGLE_CLIENT_SECRET'] = "dummy"
os.environ['REDASH_MULTI_ORG'] = "true"

from redash import create_app
from redash import redis_connection
from redash.models import db
from redash.utils import json_dumps
from tests.factories import Factory, user_factory


logging.disable("INFO")
logging.getLogger("metrics").setLevel("ERROR")


def authenticate_request(c, user):
    with c.session_transaction() as sess:
        sess['user_id'] = user.id


@contextmanager
def authenticated_user(c, user=None):
    if not user:
        user = user_factory.create()
        db.session.commit()
    authenticate_request(c, user)

    yield user


class BaseTestCase(TestCase):
    def setUp(self):
        self.app = create_app()
        self.db = db
        self.app.config['TESTING'] = True
        self.app_ctx = self.app.app_context()
        self.app_ctx.push()
        db.session.close()
        db.drop_all()
        db.create_all()
        self.factory = Factory()
        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.get_engine(self.app).dispose()
        self.app_ctx.pop()
        redis_connection.flushdb()

    def make_request(self, method, path, org=None, user=None, data=None,
                     is_json=True):
        if user is None:
            user = self.factory.user

        if org is None:
            org = self.factory.org

        if org is not False:
            path = "/{}{}".format(org.slug, path)

        if user:
            authenticate_request(self.client, user)

        method_fn = getattr(self.client, method.lower())
        headers = {}

        if data and is_json:
            data = json_dumps(data)

        if is_json:
            content_type = 'application/json'
        else:
            content_type = None

        response = method_fn(path, data=data, headers=headers, content_type=content_type)

        if response.data and is_json:
            response.json = json.loads(response.data)

        return response

    def get_request(self, path, org=None):
        if org:
            path = "/{}{}".format(org.slug, path)

        return self.client.get(path)

    def post_request(self, path, data=None, org=None):
        if org:
            path = "/{}{}".format(org.slug, path)

        return self.client.post(path, data=data)

    def assertResponseEqual(self, expected, actual):
        for k, v in expected.iteritems():
            if isinstance(v, datetime.datetime) or isinstance(actual[k], datetime.datetime):
                continue

            if isinstance(v, list):
                continue

            if isinstance(v, dict):
                self.assertResponseEqual(v, actual[k])
                continue

            self.assertEqual(v, actual[k], "{} not equal (expected: {}, actual: {}).".format(k, v, actual[k]))
