from tests import BaseTestCase
import mock
import time
from redash import settings
from redash.models import User
from redash.authentication.account import invite_token


class TestInvite(BaseTestCase):
    def test_expired_invite_token(self):

        with mock.patch('time.time') as patched_time:
            patched_time.return_value = time.time() - (7 * 24 * 3600) - 10
            token = invite_token(self.factory.user)

        response = self.get_request('/invite/{}'.format(token), org=self.factory.org)
        self.assertEqual(response.status_code, 400)

    def test_invalid_invite_token(self):
        response = self.get_request('/invite/badtoken', org=self.factory.org)
        self.assertEqual(response.status_code, 400)

    def test_valid_token(self):
        token = invite_token(self.factory.user)
        response = self.get_request('/invite/{}'.format(token), org=self.factory.org)
        self.assertEqual(response.status_code, 200)

    def test_already_active_user(self):
        pass


class TestInvitePost(BaseTestCase):
    def test_empty_password(self):
        token = invite_token(self.factory.user)
        response = self.post_request('/invite/{}'.format(token), data={'password': ''}, org=self.factory.org)
        self.assertEqual(response.status_code, 400)

    def test_invalid_password(self):
        token = invite_token(self.factory.user)
        response = self.post_request('/invite/{}'.format(token), data={'password': '1234'}, org=self.factory.org)
        self.assertEqual(response.status_code, 400)

    def test_bad_token(self):
        response = self.post_request('/invite/{}'.format('jdsnfkjdsnfkj'), data={'password': '1234'}, org=self.factory.org)
        self.assertEqual(response.status_code, 400)

    def test_already_active_user(self):
        pass

    def test_valid_password(self):
        token = invite_token(self.factory.user)
        password = 'test1234'
        response = self.post_request('/invite/{}'.format(token), data={'password': password}, org=self.factory.org)
        self.assertEqual(response.status_code, 302)
        user = User.query.get(self.factory.user.id)
        self.assertTrue(user.verify_password(password))


class TestLogin(BaseTestCase):
    def test_throttle_login(self):
        # Extract the limit from settings (ex: '50/day')
        limit = settings.THROTTLE_LOGIN_PATTERN.split('/')[0]
        for _ in range(0, int(limit)):
            self.get_request('/login', org=self.factory.org)

        response = self.get_request('/login', org=self.factory.org)
        self.assertEqual(response.status_code, 429)


class TestSession(BaseTestCase):
    # really simple test just to trigger this route
    def test_get(self):
        self.make_request('get', '/api/session', user=self.factory.user)
