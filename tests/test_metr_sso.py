import json
import os
import tempfile
import time
from unittest.mock import patch

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from redash.authentication import jwt_auth
from redash.settings import metr as metr_settings
from tests import BaseTestCase


def a_signing_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def private_pem(key):
    return key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode()


def public_pem(key):
    return (
        key.public_key()
        .public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo)
        .decode()
    )


SIGNING_KEY = a_signing_key()


class HandOffTestCase(BaseTestCase):
    issuer = "https://sso.metr.test"
    audience = "metr-dashboards"
    cookie_name = "metr_dashboards_sso"

    def setUp(self):
        super(HandOffTestCase, self).setUp()
        self.configure(
            SSO_LOGIN_URL="https://{org_slug}.metr.test/sso/dashboards/",
            SSO_CALLBACK_JWKS_URL="file://" + self.a_key_file(SIGNING_KEY),
            SSO_ISSUER=self.issuer,
            SSO_AUDIENCE=self.audience,
            SSO_ALGORITHMS=["RS256"],
            SSO_COOKIE_NAME=self.cookie_name,
            SSO_COOKIE_DOMAIN="",
        )
        jwt_auth.get_public_keys.key_cache.clear()
        self.addCleanup(jwt_auth.get_public_keys.key_cache.clear)

    def a_key_file(self, key):
        handle, path = tempfile.mkstemp(suffix=".pem")
        with os.fdopen(handle, "w") as key_file:
            key_file.write(public_pem(key))
        self.addCleanup(os.remove, path)
        return path

    def a_token(self, email, key=None, **overrides):
        issued_at = int(time.time())
        claims = {
            "iss": self.issuer,
            "aud": self.audience,
            "email": email,
            "iat": issued_at,
            "exp": issued_at + 300,
        }
        claims.update(overrides)
        claims = {name: value for name, value in claims.items() if value is not None}
        return jwt.encode(claims, private_pem(key or SIGNING_KEY), algorithm="RS256")

    def spend(self, token, next_path=None):
        self.client.set_cookie(self.cookie_name, token)
        path = "/{}/metr/callback".format(self.slug)
        if next_path:
            path = "{}?next={}".format(path, next_path)
        return self.client.get(path)

    def hand_off_cookie_headers(self, response):
        return [
            header for header in response.headers.getlist("Set-Cookie") if header.startswith(self.cookie_name + "=")
        ]

    def signed_in_email(self):
        response = self.client.get("/{}/api/session".format(self.slug))
        if response.status_code != 200:
            return None
        return json.loads(response.data)["user"]["email"]

    def configure(self, **settings):
        for name, value in settings.items():
            patched = patch.object(metr_settings, name, value)
            patched.start()
            self.addCleanup(patched.stop)

    @property
    def slug(self):
        return self.factory.org.slug


class TestTheWayOutToCoreBackend(HandOffTestCase):
    def test_it_sends_the_visitor_to_their_own_tenant(self):
        response = self.client.get("/{}/metr/login".format(self.slug))

        expected = "https://{}.metr.test/sso/dashboards/?next=/{}/".format(self.slug, self.slug)
        assert expected == response.headers["Location"]

    def test_the_requested_page_travels_along(self):
        response = self.client.get("/{}/metr/login?next=/{}/dashboard/heating".format(self.slug, self.slug))

        expected = "https://{}.metr.test/sso/dashboards/?next=/{}/dashboard/heating".format(self.slug, self.slug)
        assert expected == response.headers["Location"]

    def test_it_refuses_a_return_path_leaving_the_dashboards(self):
        response = self.client.get("/{}/metr/login?next=https://elsewhere.example.com/".format(self.slug))

        expected = "https://{}.metr.test/sso/dashboards/?next=/".format(self.slug)
        assert expected == response.headers["Location"]

    def test_it_stays_put_when_no_identity_provider_is_configured(self):
        self.configure(SSO_LOGIN_URL="")

        response = self.client.get("/{}/metr/login".format(self.slug))

        assert "/{}/".format(self.slug) == response.headers["Location"]


class TestTheLoginButton(HandOffTestCase):
    def test_the_login_page_offers_our_provider(self):
        response = self.client.get("/{}/login".format(self.slug))

        assert "/{}/metr/login".format(self.slug) in response.data.decode()

    def test_the_requested_page_travels_along(self):
        response = self.client.get("/{}/login?next=/{}/dashboard/heating".format(self.slug, self.slug))

        expected = "/{}/metr/login?next=/{}/dashboard/heating".format(self.slug, self.slug)
        assert expected in response.data.decode()

    def test_an_installation_without_the_hand_off_is_offered_nothing(self):
        self.configure(SSO_LOGIN_URL="")

        response = self.client.get("/{}/login".format(self.slug))

        assert "/metr/login" not in response.data.decode()


class TestSpendingAToken(HandOffTestCase):
    def test_it_signs_the_visitor_in(self):
        user = self.factory.create_user()

        self.spend(self.a_token(user.email))

        assert user.email == self.signed_in_email()

    def test_the_session_outlives_the_token(self):
        user = self.factory.create_user()

        self.spend(self.a_token(user.email))
        self.client.delete_cookie(self.cookie_name)

        assert user.email == self.signed_in_email()

    def test_the_token_is_spent_rather_than_left_lying_around(self):
        user = self.factory.create_user()

        response = self.spend(self.a_token(user.email))

        cleared = self.hand_off_cookie_headers(response)
        assert 1 == len(cleared)
        assert "Expires=Thu, 01 Jan 1970" in cleared[0]

    def test_it_returns_the_visitor_to_the_page_they_asked_for(self):
        user = self.factory.create_user()

        response = self.spend(self.a_token(user.email), next_path="/{}/dashboard/heating".format(self.slug))

        assert "/{}/dashboard/heating".format(self.slug) == response.headers["Location"]

    def test_logging_out_afterwards_stays_logged_out(self):
        user = self.factory.create_user()
        self.spend(self.a_token(user.email))

        self.client.get("/{}/logout".format(self.slug))

        assert self.signed_in_email() is None
