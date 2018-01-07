from redash.settings import helpers
from unittest import TestCase

class TestSettingsHelpers(TestCase):
    def test_saml_settings_check_saml_disabled(self):
        settings = {
            'auth_saml_enabled': False,
            'auth_saml_want_response_signed': False,
            'auth_saml_want_assertions_signed': False
        }

        self.assertEqual(helpers.check_saml_settings_security(settings), True)

    def test_saml_settings_check_valid_config(self):
        settings = {
            'auth_saml_enabled': True,
            'auth_saml_want_response_signed': True,
            'auth_saml_want_assertions_signed': False
        }

        self.assertEqual(helpers.check_saml_settings_security(settings), True)

    def test_saml_settings_check_invalid_config(self):
        settings = {
            'auth_saml_enabled': True,
            'auth_saml_want_response_signed': False,
            'auth_saml_want_assertions_signed': False
        }

        with self.assertRaisesRegexp(Exception, 'must require signed responses'):
            helpers.check_saml_settings_security(settings)
