from unittest.mock import patch

from redash.settings import metr as metr_settings
from tests import BaseTestCase


class HandOffTestCase(BaseTestCase):
    def setUp(self):
        super(HandOffTestCase, self).setUp()
        self.configure(SSO_LOGIN_URL="https://{org_slug}.metr.test/sso/dashboards/")

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
