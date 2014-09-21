from mock import patch
from tests import BaseTestCase
from redash import models
from redash.google_oauth import create_and_login_user
from tests.factories import user_factory


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