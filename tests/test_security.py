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


class TestFormSizeLimit(BaseTestCase):
    def post_login(self, size):
        return self.client.post(
            "/{}/login".format(self.factory.org.slug),
            data={"email": "x" * size, "password": "secret"},
        )

    def test_rejects_fields_over_the_limit(self):
        self.assertEqual(413, self.post_login(600_000).status_code)

    def test_limit_is_configurable(self):
        self.app.config["MAX_FORM_MEMORY_SIZE"] = 1_000_000
        self.assertNotEqual(413, self.post_login(600_000).status_code)
