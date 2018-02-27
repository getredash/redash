from tests import BaseTestCase
from redash.models import ApiKey

class TestOrganization(BaseTestCase):
    def test_saml_signature_default_settings(self):
        # Previously, these two settings were hard-coded into the codebase
        # and thus it's important that the defaults never change (that could
        # break existing installations). The old values were:
        # - want_assertions_signed: True
        # - want_response_signed: False
        self.assertTrue(self.factory.org.get_setting('auth_saml_want_assertions_signed'))
        self.assertFalse(self.factory.org.get_setting('auth_saml_want_response_signed'))
