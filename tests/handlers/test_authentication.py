import time

import mock

from redash import limiter, settings
from redash.authentication.account import invite_token
from redash.models import User
from tests import BaseTestCase


class TestResetPassword(BaseTestCase):
    def test_shows_reset_password_form(self):
        user = self.factory.create_user(is_invitation_pending=False)
        token = invite_token(user)
        response = self.get_request("/reset/{}".format(token), org=self.factory.org)
        self.assertEqual(response.status_code, 200)


class TestInvite(BaseTestCase):
    def test_expired_invite_token(self):
        with mock.patch("time.time") as patched_time:
            patched_time.return_value = time.time() - (7 * 24 * 3600) - 10
            token = invite_token(self.factory.user)

        response = self.get_request("/invite/{}".format(token), org=self.factory.org)
        self.assertEqual(response.status_code, 400)

    def test_invalid_invite_token(self):
        response = self.get_request("/invite/badtoken", org=self.factory.org)
        self.assertEqual(response.status_code, 400)

    def test_valid_token(self):
        user = self.factory.create_user(is_invitation_pending=True)
        token = invite_token(user)
        response = self.get_request("/invite/{}".format(token), org=self.factory.org)
        self.assertEqual(response.status_code, 200)

    def test_already_active_user(self):
        token = invite_token(self.factory.user)
        self.post_request(
            "/invite/{}".format(token),
            data={"password": "test1234"},
            org=self.factory.org,
        )
        response = self.get_request("/invite/{}".format(token), org=self.factory.org)
        self.assertEqual(response.status_code, 400)


class TestInvitePost(BaseTestCase):
    def test_empty_password(self):
        token = invite_token(self.factory.user)
        response = self.post_request("/invite/{}".format(token), data={"password": ""}, org=self.factory.org)
        self.assertEqual(response.status_code, 400)

    def test_invalid_password(self):
        token = invite_token(self.factory.user)
        response = self.post_request("/invite/{}".format(token), data={"password": "1234"}, org=self.factory.org)
        self.assertEqual(response.status_code, 400)

    def test_bad_token(self):
        response = self.post_request(
            "/invite/{}".format("jdsnfkjdsnfkj"),
            data={"password": "1234"},
            org=self.factory.org,
        )
        self.assertEqual(response.status_code, 400)

    def test_user_invited_before_invitation_pending_check(self):
        user = self.factory.create_user(details={})
        token = invite_token(user)
        response = self.post_request(
            "/invite/{}".format(token),
            data={"password": "test1234"},
            org=self.factory.org,
        )
        self.assertEqual(response.status_code, 302)

    def test_already_active_user(self):
        token = invite_token(self.factory.user)
        self.post_request(
            "/invite/{}".format(token),
            data={"password": "test1234"},
            org=self.factory.org,
        )
        response = self.post_request(
            "/invite/{}".format(token),
            data={"password": "test1234"},
            org=self.factory.org,
        )
        self.assertEqual(response.status_code, 400)

    def test_valid_password(self):
        user = self.factory.create_user(is_invitation_pending=True)
        token = invite_token(user)
        password = "test1234"
        response = self.post_request(
            "/invite/{}".format(token),
            data={"password": password},
            org=self.factory.org,
        )
        self.assertEqual(response.status_code, 302)
        user = User.query.get(user.id)
        self.assertTrue(user.verify_password(password))
        self.assertFalse(user.is_invitation_pending)


class TestLogin(BaseTestCase):
    def test_throttle_login(self):
        limiter.enabled = True
        # Extract the limit from settings (ex: '50/day')
        limit = settings.THROTTLE_LOGIN_PATTERN.split("/")[0]
        for _ in range(0, int(limit)):
            self.get_request("/login", org=self.factory.org)

        response = self.get_request("/login", org=self.factory.org)
        self.assertEqual(response.status_code, 429)

    def test_throttle_password_reset(self):
        limiter.enabled = True
        # Extract the limit from settings (ex: '10/hour')
        limit = settings.THROTTLE_PASS_RESET_PATTERN.split("/")[0]
        for _ in range(0, int(limit)):
            self.get_request("/forgot", org=self.factory.org)

        response = self.get_request("/forgot", org=self.factory.org)
        self.assertEqual(response.status_code, 429)


class TestSession(BaseTestCase):
    # really simple test just to trigger this route
    def test_get(self):
        self.make_request("get", "/default/api/session", user=self.factory.user, org=False)
