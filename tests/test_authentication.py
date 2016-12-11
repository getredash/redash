import time

from flask import request
from mock import patch
from redash import models
from redash.authentication import (api_key_load_user_from_request,
                                   hmac_load_user_from_request, sign)
from redash.authentication.google_oauth import (create_and_login_user,
                                                verify_profile)
from tests import BaseTestCase


class TestApiKeyAuthentication(BaseTestCase):
    #
    # This is a bad way to write these tests, but the way Flask works doesn't make it easy to write them properly...
    #
    def setUp(self):
        super(TestApiKeyAuthentication, self).setUp()
        self.api_key = '10'
        self.query = self.factory.create_query(api_key=self.api_key)
        models.db.session.flush()
        self.query_url = '/{}/api/queries/{}'.format(self.factory.org.slug, self.query.id)
        self.queries_url = '/{}/api/queries'.format(self.factory.org.slug)

    def test_no_api_key(self):
        with self.app.test_client() as c:
            rv = c.get(self.query_url)
            self.assertIsNone(api_key_load_user_from_request(request))

    def test_wrong_api_key(self):
        with self.app.test_client() as c:
            rv = c.get(self.query_url, query_string={'api_key': 'whatever'})
            self.assertIsNone(api_key_load_user_from_request(request))

    def test_correct_api_key(self):
        with self.app.test_client() as c:
            rv = c.get(self.query_url, query_string={'api_key': self.api_key})
            self.assertIsNotNone(api_key_load_user_from_request(request))

    def test_no_query_id(self):
        with self.app.test_client() as c:
            rv = c.get(self.queries_url, query_string={'api_key': self.api_key})
            self.assertIsNone(api_key_load_user_from_request(request))

    def test_user_api_key(self):
        user = self.factory.create_user(api_key="user_key")
        models.db.session.flush()
        with self.app.test_client() as c:
            rv = c.get(self.queries_url, query_string={'api_key': user.api_key})
            self.assertEqual(user.id, api_key_load_user_from_request(request).id)

    def test_api_key_header(self):
        with self.app.test_client() as c:
            rv = c.get(self.query_url, headers={'Authorization': "Key {}".format(self.api_key)})
            self.assertIsNotNone(api_key_load_user_from_request(request))

    def test_api_key_header_with_wrong_key(self):
        with self.app.test_client() as c:
            rv = c.get(self.query_url, headers={'Authorization': "Key oops"})
            self.assertIsNone(api_key_load_user_from_request(request))

    def test_api_key_for_wrong_org(self):
        other_user = self.factory.create_admin(org=self.factory.create_org())

        with self.app.test_client() as c:
            rv = c.get(self.query_url, headers={'Authorization': "Key {}".format(other_user.api_key)})
            self.assertEqual(404, rv.status_code)


class TestHMACAuthentication(BaseTestCase):
    #
    # This is a bad way to write these tests, but the way Flask works doesn't make it easy to write them properly...
    #
    def setUp(self):
        super(TestHMACAuthentication, self).setUp()
        self.api_key = '10'
        self.query = self.factory.create_query(api_key=self.api_key)
        models.db.session.flush()
        self.path = '/{}/api/queries/{}'.format(self.query.org.slug, self.query.id)
        self.expires = time.time() + 1800

    def signature(self, expires):
        return sign(self.query.api_key, self.path, expires)

    def test_no_signature(self):
        with self.app.test_client() as c:
            rv = c.get(self.path)
            self.assertIsNone(hmac_load_user_from_request(request))

    def test_wrong_signature(self):
        with self.app.test_client() as c:
            rv = c.get(self.path, query_string={'signature': 'whatever', 'expires': self.expires})
            self.assertIsNone(hmac_load_user_from_request(request))

    def test_correct_signature(self):
        with self.app.test_client() as c:
            rv = c.get(self.path, query_string={'signature': self.signature(self.expires), 'expires': self.expires})
            self.assertIsNotNone(hmac_load_user_from_request(request))

    def test_no_query_id(self):
        with self.app.test_client() as c:
            rv = c.get('/{}/api/queries'.format(self.query.org.slug), query_string={'api_key': self.api_key})
            self.assertIsNone(hmac_load_user_from_request(request))

    def test_user_api_key(self):
        user = self.factory.create_user(api_key="user_key")
        path = '/api/queries/'
        models.db.session.flush()

        signature = sign(user.api_key, path, self.expires)
        with self.app.test_client() as c:
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
            user = models.User.query.filter(models.User.email == email).one()
            self.assertEqual(user.email, email)

    def test_updates_user_name(self):
        user = self.factory.create_user(email='test@example.com')

        with patch('redash.authentication.google_oauth.login_user') as login_user_mock:
            create_and_login_user(self.factory.org, "New Name", user.email)
            login_user_mock.assert_called_once_with(user, remember=True)


class TestVerifyProfile(BaseTestCase):
    def test_no_domain_allowed_for_org(self):
        profile = dict(email='arik@example.com')
        self.assertFalse(verify_profile(self.factory.org, profile))

    def test_domain_not_in_org_domains_list(self):
        profile = dict(email='arik@example.com')
        self.factory.org.settings[models.Organization.SETTING_GOOGLE_APPS_DOMAINS] = ['example.org']
        self.assertFalse(verify_profile(self.factory.org, profile))

    def test_domain_in_org_domains_list(self):
        profile = dict(email='arik@example.com')
        self.factory.org.settings[models.Organization.SETTING_GOOGLE_APPS_DOMAINS] = ['example.com']
        self.assertTrue(verify_profile(self.factory.org, profile))

        self.factory.org.settings[models.Organization.SETTING_GOOGLE_APPS_DOMAINS] = ['example.org', 'example.com']
        self.assertTrue(verify_profile(self.factory.org, profile))

    def test_org_in_public_mode_accepts_any_domain(self):
        profile = dict(email='arik@example.com')
        self.factory.org.settings[models.Organization.SETTING_IS_PUBLIC] = True
        self.factory.org.settings[models.Organization.SETTING_GOOGLE_APPS_DOMAINS] = []
        self.assertTrue(verify_profile(self.factory.org, profile))

    def test_user_not_in_domain_but_account_exists(self):
        profile = dict(email='arik@example.com')
        self.factory.create_user(email='arik@example.com')
        self.factory.org.settings[models.Organization.SETTING_GOOGLE_APPS_DOMAINS] = ['example.org']
        self.assertTrue(verify_profile(self.factory.org, profile))
