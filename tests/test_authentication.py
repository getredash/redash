from flask.ext.login import current_user
from mock import patch
from tests import BaseTestCase
from redash import models
from redash.google_oauth import create_and_login_user
from redash.authentication import ApiKeyAuthentication
from tests.factories import user_factory, query_factory
from redash.wsgi import app


class TestApiKeyAuthentication(BaseTestCase):
    #
    # This is a bad way to write these tests, but the way Flask works doesn't make it easy to write them properly...
    #
    def setUp(self):
        super(TestApiKeyAuthentication, self).setUp()
        self.api_key = 10
        self.query = query_factory.create(api_key=self.api_key)

    def test_no_api_key(self):
        auth = ApiKeyAuthentication()
        with app.test_client() as c:
            rv = c.get('/api/queries/{0}'.format(self.query.id))#, query_string={'api_key': 'whatever'})
            self.assertFalse(auth.verify_authentication())

    def test_wrong_api_key(self):
        auth = ApiKeyAuthentication()
        with app.test_client() as c:
            rv = c.get('/api/queries/{0}'.format(self.query.id), query_string={'api_key': 'whatever'})
            self.assertFalse(auth.verify_authentication())

    def test_correct_api_key(self):
        auth = ApiKeyAuthentication()
        with app.test_client() as c:
            rv = c.get('/api/queries/{0}'.format(self.query.id), query_string={'api_key': self.api_key})
            self.assertTrue(auth.verify_authentication())

    def test_no_query_id(self):
        auth = ApiKeyAuthentication()
        with app.test_client() as c:
            rv = c.get('/api/queries', query_string={'api_key': self.api_key})
            self.assertFalse(auth.verify_authentication())


class TestCreateAndLoginUser(BaseTestCase):
    def test_logins_valid_user(self):
        user = user_factory.create(email='test@example.com')

        with patch('redash.google_oauth.login_user') as login_user_mock:
            create_and_login_user(user.name, user.email)
            login_user_mock.assert_called_once_with(user, remember=True)

    def test_creates_vaild_new_user(self):
        email = 'test@example.com'
        name = 'Test User'

        with patch('redash.google_oauth.login_user') as login_user_mock:

            create_and_login_user(name, email)

            self.assertTrue(login_user_mock.called)
            user = models.User.get(models.User.email == email)