from unittest import TestCase
from mock import patch
from flask_googleauth import ObjectDict
from tests import BaseTestCase
from redash.authentication import validate_email, create_and_login_user
from redash import settings, models
from tests.factories import user_factory


class TestEmailValidation(TestCase):
    def test_accepts_address_with_correct_domain(self):
        with patch.object(settings, 'GOOGLE_APPS_DOMAIN', 'example.com'):
            self.assertTrue(validate_email('example@example.com'))

    def test_accepts_address_from_exception_list(self):
        with patch.multiple(settings, GOOGLE_APPS_DOMAIN='example.com', ALLOWED_EXTERNAL_USERS=['whatever@whatever.com']):
            self.assertTrue(validate_email('whatever@whatever.com'))

    def test_accept_any_address_when_domain_empty(self):
        with patch.object(settings, 'GOOGLE_APPS_DOMAIN', None):
            self.assertTrue(validate_email('whatever@whatever.com'))

    def test_rejects_address_with_incorrect_domain(self):
        with patch.object(settings, 'GOOGLE_APPS_DOMAIN', 'example.com'):
            self.assertFalse(validate_email('whatever@whatever.com'))


class TestCreateAndLoginUser(BaseTestCase):
    def test_logins_valid_user(self):
        user = user_factory.create(email='test@example.com')

        with patch.object(settings, 'GOOGLE_APPS_DOMAIN', 'example.com'), patch('redash.authentication.login_user') as login_user_mock:
            create_and_login_user(None, user)
            login_user_mock.assert_called_once_with(user, remember=True)

    def test_creates_vaild_new_user(self):
        openid_user = ObjectDict({'email': 'test@example.com', 'name': 'Test User'})

        with patch.multiple(settings, GOOGLE_APPS_DOMAIN='example.com', ADMINS=['admin@example.com']), \
             patch('redash.authentication.login_user') as login_user_mock:

            create_and_login_user(None, openid_user)

            self.assertTrue(login_user_mock.called)
            user = models.User.get(models.User.email == openid_user.email)

            self.assertFalse(user.is_admin)

    def test_creates_vaild_new_user_and_sets_is_admin(self):
        openid_user = ObjectDict({'email': 'admin@example.com', 'name': 'Test User'})

        with patch.multiple(settings, GOOGLE_APPS_DOMAIN='example.com', ADMINS=['admin@example.com']), \
             patch('redash.authentication.login_user') as login_user_mock:

            create_and_login_user(None, openid_user)

            self.assertTrue(login_user_mock.called)
            user = models.User.get(models.User.email == openid_user.email)
            self.assertTrue(user.is_admin)

    def test_ignores_invliad_user(self):
        user = ObjectDict({'email': 'test@whatever.com'})

        with patch.object(settings, 'GOOGLE_APPS_DOMAIN', 'example.com'), patch('redash.authentication.login_user') as login_user_mock:
            create_and_login_user(None, user)
            self.assertFalse(login_user_mock.called)