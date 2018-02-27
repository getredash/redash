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

    def test_saml_signature_settings_validation(self):
        admin = self.factory.create_admin()
        data = {
            'auth_saml_enabled': True,
            'auth_saml_want_response_signed': False,
            'auth_saml_want_assertions_signed': False
        }

        rv = self.make_request('post', '/api/settings/organization', data=data, user=admin)
        self.assertEqual(rv.status_code, 400, 'Endpoint rejected the update')

        # Check that this invalid configuration did not persist
        updated_org = Organization.get_by_slug(self.factory.org.slug)
        check_sigs = updated_org.get_setting('auth_saml_want_response_signed') or \
            updated_org.get_setting('auth_saml_want_assertions_signed')
        self.assertEqual(check_sigs, True)
