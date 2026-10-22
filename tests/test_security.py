from unittest import TestCase

from redash.settings.helpers import parse_samesite
from tests import BaseTestCase


class TestSessionCookie(BaseTestCase):
    def test_session_cookie_has_no_samesite_by_default(self):
        user = self.factory.create_user(password_hash=None)
        user.hash_password("secret123")
        self.db.session.commit()

        rv = self.client.post(
            "/{}/login".format(self.factory.org.slug),
            data={"email": user.email, "password": "secret123"},
        )

        session_cookies = [h for h in rv.headers.getlist("Set-Cookie") if h.startswith("session=")]
        self.assertTrue(session_cookies)
        self.assertNotIn("samesite", session_cookies[0].lower())


class TestParseSameSite(TestCase):
    def test_unset(self):
        self.assertIsNone(parse_samesite(None, secure=False))
        self.assertIsNone(parse_samesite("", secure=False))

    def test_normalizes_case(self):
        self.assertEqual("Lax", parse_samesite("lax", secure=False))
        self.assertEqual("Strict", parse_samesite("STRICT", secure=False))

    def test_rejects_unknown_values(self):
        with self.assertRaises(ValueError):
            parse_samesite("relaxed", secure=True)

    def test_none_requires_secure_cookies(self):
        self.assertEqual("None", parse_samesite("none", secure=True))
        with self.assertRaises(ValueError):
            parse_samesite("None", secure=False)
