from tests import BaseTestCase
from redash.models import Organization


class TestOrganizationSettings(BaseTestCase):
    def test_post(self):
        admin = self.factory.create_admin()
        rv = self.make_request('post', '/api/settings/organization', data={'auth_password_login_enabled': False}, user=admin)
        self.assertEqual(rv.json['settings']['auth_password_login_enabled'], False)
        self.assertEqual(self.factory.org.settings['settings']['auth_password_login_enabled'], False)

        rv = self.make_request('post', '/api/settings/organization', data={'auth_password_login_enabled': True}, user=admin)
        updated_org = Organization.get_by_slug(self.factory.org.slug)
        self.assertEqual(rv.json['settings']['auth_password_login_enabled'], True)
        self.assertEqual(updated_org.settings['settings']['auth_password_login_enabled'], True)