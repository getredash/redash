import json
import os
import shutil
import tempfile
import time
from unittest.mock import patch

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from sqlalchemy.exc import IntegrityError

from redash.app import create_app
from redash.authentication import jwt_auth, metr_sso
from redash.models import db
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
            SSO_TENANT_CLAIM="tenant",
        )
        jwt_auth.get_public_keys.key_cache.clear()
        self.addCleanup(jwt_auth.get_public_keys.key_cache.clear)

    def a_key_file(self, key):
        handle, path = tempfile.mkstemp(suffix=".pem")
        with os.fdopen(handle, "w") as key_file:
            key_file.write(public_pem(key))
        self.addCleanup(os.remove, path)
        return path

    def a_key_directory(self, keys_by_slug):
        directory = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, directory)
        for slug, key in keys_by_slug.items():
            with open(os.path.join(directory, "{}.pem".format(slug)), "w") as key_file:
                key_file.write(public_pem(key))
        return directory

    def a_token(self, email=None, key=None, org=None, **overrides):
        issued_at = int(time.time())
        claims = {
            "iss": self.issuer,
            "aud": self.audience,
            "email": email,
            "tenant": (org or self.factory.org).slug,
            "iat": issued_at,
            "exp": issued_at + 300,
        }
        claims.update(overrides)
        claims = {name: value for name, value in claims.items() if value is not None}
        return jwt.encode(claims, private_pem(key or SIGNING_KEY), algorithm="RS256")

    def spend(self, token, next_path=None, org=None):
        self.client.set_cookie(self.cookie_name, token)
        path = "/{}/metr/callback".format((org or self.factory.org).slug)
        if next_path:
            path = "{}?next={}".format(path, next_path)
        return self.client.get(path)

    def hand_off_cookie_headers(self, response):
        return [
            header for header in response.headers.getlist("Set-Cookie") if header.startswith(self.cookie_name + "=")
        ]

    def login_path(self, org=None):
        return "/{}/login".format((org or self.factory.org).slug)

    def a_standard_group(self, org=None):
        group = self.factory.create_group(org=org or self.factory.org, name="standard", type="standard")
        db.session.commit()
        return group

    def signed_in_groups(self, org=None):
        response = self.client.get("/{}/api/session".format((org or self.factory.org).slug))
        return json.loads(response.data)["user"]["groups"]

    def signed_in_email(self, org=None):
        response = self.client.get("/{}/api/session".format((org or self.factory.org).slug))
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


class TestRefusingAToken(HandOffTestCase):
    def test_a_token_nobody_signed_is_refused(self):
        response = self.spend("this-is-not-a-token")

        assert self.login_path() == response.headers["Location"]
        assert self.signed_in_email() is None

    def test_arriving_with_no_token_at_all_is_refused(self):
        response = self.client.get("/{}/metr/callback".format(self.slug))

        assert self.login_path() == response.headers["Location"]
        assert self.signed_in_email() is None

    def test_a_token_signed_by_somewhere_else_is_refused(self):
        user = self.factory.create_user()

        response = self.spend(self.a_token(user.email, key=a_signing_key()))

        assert self.login_path() == response.headers["Location"]
        assert self.signed_in_email() is None

    def test_keys_that_cannot_be_read_refuse_the_login(self):
        user = self.factory.create_user()
        self.configure(SSO_CALLBACK_JWKS_URL="file:///nowhere/at/all.pem")

        response = self.spend(self.a_token(user.email))

        assert self.login_path() == response.headers["Location"]
        assert self.signed_in_email() is None

    def test_a_token_naming_no_email_is_refused(self):
        response = self.spend(self.a_token())

        assert self.login_path() == response.headers["Location"]
        assert self.signed_in_email() is None

    def test_a_refused_token_is_thrown_away_too(self):
        response = self.spend("this-is-not-a-token")

        cleared = self.hand_off_cookie_headers(response)
        assert 1 == len(cleared)
        assert "Expires=Thu, 01 Jan 1970" in cleared[0]

    def test_the_login_page_stays_reachable_with_a_token_from_elsewhere(self):
        self.client.set_cookie(self.cookie_name, "a-token-minted-somewhere-else")

        response = self.client.get(self.login_path())

        assert 200 == response.status_code


class TestWhereTheKeysAreFetchedFrom(HandOffTestCase):
    def an_organization_served_from_its_own_url(self):
        key = a_signing_key()
        org = self.factory.create_org()
        directory = self.a_key_directory({self.slug: SIGNING_KEY, org.slug: key})
        self.configure(SSO_CALLBACK_JWKS_URL="file://" + directory + "/{org_slug}.pem")
        return org, key

    def test_each_organization_fetches_them_from_its_own_url(self):
        other_org, other_key = self.an_organization_served_from_its_own_url()
        arriving = self.factory.create_user(org=other_org)

        self.spend(self.a_token(arriving.email, key=other_key, org=other_org), org=other_org)

        assert arriving.email == self.signed_in_email(org=other_org)

    def test_a_url_naming_no_organization_is_used_as_it_stands(self):
        user = self.factory.create_user()
        self.configure(SSO_CALLBACK_JWKS_URL="file://" + self.a_key_file(SIGNING_KEY))

        self.spend(self.a_token(user.email))

        assert user.email == self.signed_in_email()


class TestTheTenantClaim(HandOffTestCase):
    def test_a_token_issued_for_another_organization_is_refused(self):
        other_org = self.factory.create_org()
        arriving = self.factory.create_user(org=other_org)

        response = self.spend(self.a_token(arriving.email, org=other_org))

        assert self.login_path() == response.headers["Location"]
        assert self.signed_in_email() is None

    def test_a_token_naming_no_tenant_is_refused(self):
        user = self.factory.create_user()

        response = self.spend(self.a_token(user.email, tenant=None))

        assert self.login_path() == response.headers["Location"]
        assert self.signed_in_email() is None


class TestConfiguration(HandOffTestCase):
    def test_a_hand_off_without_a_tenant_claim_is_refused(self):
        self.configure(SSO_TENANT_CLAIM="")

        with pytest.raises(metr_sso.MisconfiguredError):
            create_app()

    def test_naming_the_tenant_claim_is_accepted(self):
        app = create_app()

        assert "metr_sso" in app.blueprints

    def test_an_installation_not_using_the_hand_off_needs_no_configuration(self):
        self.configure(SSO_LOGIN_URL="", SSO_TENANT_CLAIM="")

        app = create_app()

        assert "metr_sso" in app.blueprints


class TestProvisioning(HandOffTestCase):
    def test_a_newcomer_lands_in_the_standard_group(self):
        group = self.a_standard_group()

        self.spend(self.a_token("newcomer@example.com"))

        assert [group.id] == self.signed_in_groups()

    def test_an_organization_cannot_have_two_standard_groups(self):
        self.a_standard_group()

        with pytest.raises(IntegrityError):
            self.a_standard_group()

    def test_a_newcomer_stays_out_of_the_default_group(self):
        self.a_standard_group()

        self.spend(self.a_token("newcomer@example.com"))

        assert self.factory.default_group.id not in self.signed_in_groups()

    def test_somebody_already_here_keeps_the_groups_they_have(self):
        self.a_standard_group()
        user = self.factory.create_user()

        self.spend(self.a_token(user.email))

        assert user.group_ids == self.signed_in_groups()


class TestTheStandardGroupHasToExist(HandOffTestCase):
    def test_a_newcomer_is_refused_when_the_organization_has_none(self):
        response = self.spend(self.a_token("newcomer@example.com"))

        assert self.login_path() == response.headers["Location"]
        assert self.signed_in_email() is None

    def test_the_login_page_says_something_went_wrong(self):
        self.spend(self.a_token("newcomer@example.com"))

        response = self.client.get(self.login_path())

        assert "Your account could not be set up" in response.data.decode()

    def test_it_reports_the_organization_and_how_to_fix_it(self):
        with patch("redash.authentication.metr_sso.sentry.capture_exception") as reported:
            self.spend(self.a_token("newcomer@example.com"))

        reported_error = str(reported.call_args[0][0])
        assert self.slug in reported_error
        assert "create_standard_group" in reported_error

    def test_somebody_already_here_signs_in_although_the_group_is_missing(self):
        user = self.factory.create_user()

        self.spend(self.a_token(user.email))

        assert user.email == self.signed_in_email()
