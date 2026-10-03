from unittest import mock

from redash.models import Organization
from tests import BaseTestCase


class TestOrganizationSettings(BaseTestCase):
    def test_env_override_wins_over_stored_value(self):
        # When REDASH_DISABLE_PUBLIC_URLS is explicitly set, a value persisted
        # into the organizations table by an older version must not shadow it (#7630).
        self.factory.org.settings["settings"] = {"disable_public_urls": True}

        with mock.patch(
            "redash.models.organizations.org_settings_env_overrides",
            frozenset(["disable_public_urls"]),
        ):
            self.assertEqual(self.factory.org.get_setting("disable_public_urls"), False)

    def test_stored_value_applies_without_env_override(self):
        # Without the environment variable set, the stored value keeps working
        # (e.g. the Cypress sharing specs toggle it through the API).
        admin = self.factory.create_admin()
        rv = self.make_request(
            "post",
            "/api/settings/organization",
            data={"disable_public_urls": True},
            user=admin,
        )
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(self.factory.org.get_setting("disable_public_urls"), True)

    def test_post(self):
        admin = self.factory.create_admin()
        rv = self.make_request(
            "post",
            "/api/settings/organization",
            data={"auth_password_login_enabled": False},
            user=admin,
        )
        self.assertEqual(rv.json["settings"]["auth_password_login_enabled"], False)
        self.assertEqual(self.factory.org.settings["settings"]["auth_password_login_enabled"], False)

        rv = self.make_request(
            "post",
            "/api/settings/organization",
            data={"auth_password_login_enabled": True},
            user=admin,
        )
        updated_org = Organization.get_by_slug(self.factory.org.slug)
        self.assertEqual(rv.json["settings"]["auth_password_login_enabled"], True)
        self.assertEqual(updated_org.settings["settings"]["auth_password_login_enabled"], True)

    def test_updates_number_separators(self):
        admin = self.factory.create_admin()
        rv = self.make_request(
            "post",
            "/api/settings/organization",
            data={"thousands_separator": " ", "decimal_separator": ","},
            user=admin,
        )
        self.assertEqual(rv.json["settings"]["thousands_separator"], " ")
        self.assertEqual(rv.json["settings"]["decimal_separator"], ",")

        updated_org = Organization.get_by_slug(self.factory.org.slug)
        self.assertEqual(updated_org.get_setting("thousands_separator"), " ")
        self.assertEqual(updated_org.get_setting("decimal_separator"), ",")

    def test_get_returns_default_number_separators(self):
        admin = self.factory.create_admin()
        rv = self.make_request("get", "/api/settings/organization", user=admin)
        self.assertEqual(rv.json["settings"]["thousands_separator"], ",")
        self.assertEqual(rv.json["settings"]["decimal_separator"], ".")

    def test_updates_google_apps_domains(self):
        admin = self.factory.create_admin()
        domains = ["example.com"]
        self.make_request(
            "post",
            "/api/settings/organization",
            data={"auth_google_apps_domains": domains},
            user=admin,
        )
        updated_org = Organization.get_by_slug(self.factory.org.slug)
        self.assertEqual(updated_org.google_apps_domains, domains)

    def test_get_returns_google_appas_domains(self):
        admin = self.factory.create_admin()
        domains = ["example.com"]
        admin.org.settings[Organization.SETTING_GOOGLE_APPS_DOMAINS] = domains

        rv = self.make_request("get", "/api/settings/organization", user=admin)
        self.assertEqual(rv.json["settings"]["auth_google_apps_domains"], domains)
