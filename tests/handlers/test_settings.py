from redash.models import Organization
from tests import BaseTestCase


class TestOrganizationSettings(BaseTestCase):
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
