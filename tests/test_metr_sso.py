from unittest.mock import patch

from redash.settings import metr as metr_settings
from tests import BaseTestCase


class TestTheWayOutToCoreBackend(BaseTestCase):
    def test_it_sends_the_visitor_to_their_own_tenant(self):
        with patch.object(metr_settings, "SSO_LOGIN_URL", "https://{org_slug}.metr.test/sso/dashboards/"):
            response = self.client.get("/{}/metr/login".format(self.factory.org.slug))

        expected = "https://{}.metr.test/sso/dashboards/?next=/{}/".format(
            self.factory.org.slug, self.factory.org.slug
        )
        assert expected == response.headers["Location"]

    def test_the_requested_page_travels_along(self):
        with patch.object(metr_settings, "SSO_LOGIN_URL", "https://{org_slug}.metr.test/sso/dashboards/"):
            response = self.client.get(
                "/{}/metr/login?next=/{}/dashboard/heating".format(self.factory.org.slug, self.factory.org.slug)
            )

        expected = "https://{}.metr.test/sso/dashboards/?next=/{}/dashboard/heating".format(
            self.factory.org.slug, self.factory.org.slug
        )
        assert expected == response.headers["Location"]

    def test_it_refuses_a_return_path_leaving_the_dashboards(self):
        with patch.object(metr_settings, "SSO_LOGIN_URL", "https://{org_slug}.metr.test/sso/dashboards/"):
            response = self.client.get(
                "/{}/metr/login?next=https://elsewhere.example.com/".format(self.factory.org.slug)
            )

        expected = "https://{}.metr.test/sso/dashboards/?next=/".format(self.factory.org.slug)
        assert expected == response.headers["Location"]

    def test_it_stays_put_when_no_identity_provider_is_configured(self):
        with patch.object(metr_settings, "SSO_LOGIN_URL", ""):
            response = self.client.get("/{}/metr/login".format(self.factory.org.slug))

        assert "/{}/".format(self.factory.org.slug) == response.headers["Location"]
