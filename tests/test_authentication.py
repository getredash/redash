import time

from flask import request
from mock import patch

from tests import BaseTestCase
from redash import models
from redash.authentication.google_oauth import create_and_login_user, verify_profile
from redash.authentication import api_key_load_user_from_request, hmac_load_user_from_request, sign
from redash.wsgi import app


class TestApiKeyAuthentication(BaseTestCase):
    #
    # This is a bad way to write these tests, but the way Flask works doesn't make it easy to write them properly...
    #
    def setUp(self):
        super(TestApiKeyAuthentication, self).setUp()
        self.api_key = 10
        self.query = self.factory.create_query(api_key=self.api_key)
        self.query_url = '/{}/api/queries/{}'.format(self.factory.org.slug, self.query.id)
        self.queries_url = '/{}/api/queries'.format(self.factory.org.slug)

    def test_no_api_key(self):
        with app.test_client() as c:
            rv = c.get(self.query_url)
            self.assertIsNone(api_key_load_user_from_request(request))

    def test_wrong_api_key(self):
        with app.test_client() as c:
            rv = c.get(self.query_url, query_string={'api_key': 'whatever'})
            self.assertIsNone(api_key_load_user_from_request(request))

    def test_correct_api_key(self):
        with app.test_client() as c:
            rv = c.get(self.query_url, query_string={'api_key': self.api_key})
            self.assertIsNotNone(api_key_load_user_from_request(request))

    def test_no_query_id(self):
        with app.test_client() as c:
            rv = c.get(self.queries_url, query_string={'api_key': self.api_key})
            self.assertIsNone(api_key_load_user_from_request(request))

    def test_user_api_key(self):
        user = self.factory.create_user(api_key="user_key")
        with app.test_client() as c:
            rv = c.get(self.queries_url, query_string={'api_key': user.api_key})
            self.assertEqual(user.id, api_key_load_user_from_request(request).id)

    def test_api_key_header(self):
        with app.test_client() as c:
            rv = c.get(self.query_url, headers={'Authorization': "Key {}".format(self.api_key)})
            self.assertIsNotNone(api_key_load_user_from_request(request))

    def test_api_key_header_with_wrong_key(self):
        with app.test_client() as c:
            rv = c.get(self.query_url, headers={'Authorization': "Key oops"})
            self.assertIsNone(api_key_load_user_from_request(request))

    def test_api_key_for_wrong_org(self):
        other_user = self.factory.create_admin(org=self.factory.create_org())

        with app.test_client() as c:
            rv = c.get(self.query_url, headers={'Authorization': "Key {}".format(other_user.api_key)})
            self.assertEqual(404, rv.status_code)


class TestHMACAuthentication(BaseTestCase):
    #
    # This is a bad way to write these tests, but the way Flask works doesn't make it easy to write them properly...
    #
    def setUp(self):
        super(TestHMACAuthentication, self).setUp()
        self.api_key = 10
        self.query = self.factory.create_query(api_key=self.api_key)
        self.path = '/{}/api/queries/{}'.format(self.query.org.slug, self.query.id)
        self.expires = time.time() + 1800

    def signature(self, expires):
        return sign(self.query.api_key, self.path, expires)

    def test_no_signature(self):
        with app.test_client() as c:
            rv = c.get(self.path)
            self.assertIsNone(hmac_load_user_from_request(request))

    def test_wrong_signature(self):
        with app.test_client() as c:
            rv = c.get(self.path, query_string={'signature': 'whatever', 'expires': self.expires})
            self.assertIsNone(hmac_load_user_from_request(request))

    def test_correct_signature(self):
        with app.test_client() as c:
            rv = c.get(self.path, query_string={'signature': self.signature(self.expires), 'expires': self.expires})
            self.assertIsNotNone(hmac_load_user_from_request(request))

    def test_no_query_id(self):
        with app.test_client() as c:
            rv = c.get('/{}/api/queries'.format(self.query.org.slug), query_string={'api_key': self.api_key})
            self.assertIsNone(hmac_load_user_from_request(request))

    def test_user_api_key(self):
        user = self.factory.create_user(api_key="user_key")
        path = '/api/queries/'
        with app.test_client() as c:
            signature = sign(user.api_key, path, self.expires)
            rv = c.get(path, query_string={'signature': signature, 'expires': self.expires, 'user_id': user.id})
            self.assertEqual(user.id, hmac_load_user_from_request(request).id)


class TestCreateAndLoginUser(BaseTestCase):
    def test_logins_valid_user(self):
        user = self.factory.create_user(email='test@example.com')

        with patch('redash.authentication.google_oauth.login_user') as login_user_mock:
            create_and_login_user(self.factory.org, user.name, user.email)
            login_user_mock.assert_called_once_with(user, remember=True)

    def test_creates_vaild_new_user(self):
        email = 'test@example.com'
        name = 'Test User'

        with patch('redash.authentication.google_oauth.login_user') as login_user_mock:
            create_and_login_user(self.factory.org, name, email)

            self.assertTrue(login_user_mock.called)
            user = models.User.get(models.User.email == email)


class TestVerifyProfile(BaseTestCase):
    def test_no_domain_allowed_for_org(self):
        profile = dict(email='arik@example.com')
        self.assertFalse(verify_profile(self.factory.org, profile))

    def test_domain_not_in_org_domains_list(self):
        profile = dict(email='arik@example.com')
        self.factory.org.settings[models.Organization.SETTING_GOOGLE_APPS_DOMAINS] = ['example.org']
        self.factory.org.save()
        self.assertFalse(verify_profile(self.factory.org, profile))

    def test_domain_in_org_domains_list(self):
        profile = dict(email='arik@example.com')
        self.factory.org.settings[models.Organization.SETTING_GOOGLE_APPS_DOMAINS] = ['example.com']
        self.factory.org.save()
        self.assertTrue(verify_profile(self.factory.org, profile))

        self.factory.org.settings[models.Organization.SETTING_GOOGLE_APPS_DOMAINS] = ['example.org', 'example.com']
        self.factory.org.save()
        self.assertTrue(verify_profile(self.factory.org, profile))

    def test_org_in_public_mode_accepts_any_domain(self):
        profile = dict(email='arik@example.com')
        self.factory.org.settings[models.Organization.SETTING_IS_PUBLIC] = True
        self.factory.org.settings[models.Organization.SETTING_GOOGLE_APPS_DOMAINS] = []
        self.factory.org.save()
        self.assertTrue(verify_profile(self.factory.org, profile))

    def test_user_not_in_domain_but_account_exists(self):
        profile = dict(email='arik@example.com')
        self.factory.create_user(email='arik@example.com')
        self.factory.org.settings[models.Organization.SETTING_GOOGLE_APPS_DOMAINS] = ['example.org']
        self.factory.org.save()
        self.assertTrue(verify_profile(self.factory.org, profile))
