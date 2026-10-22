from unittest.mock import patch

from tests import BaseTestCase


class TestCSRFEnforcement(BaseTestCase):
    def setUp(self):
        # CSRF enforcement is wired up when the app is created, and the test environment
        # turns it off by default.
        with patch("redash.settings.ENFORCE_CSRF", True):
            super().setUp()

    def test_rejects_post_without_token(self):
        rv = self.post_request("/login", data={"email": "a@example.com", "password": "x"}, org=self.factory.org)
        self.assertEqual(rv.status_code, 400)

    def test_exempt_blueprint_does_not_require_token(self):
        # SAML is disabled for the org, so the view redirects instead of failing CSRF validation.
        rv = self.post_request("/saml/callback", data={"SAMLResponse": "x"}, org=self.factory.org)
        self.assertEqual(rv.status_code, 302)
