import mock
import os
from unittest import TestCase

from redash.settings import organization

class TestOrganizationSettings(TestCase):
    def test_exit_if_saml_config_invalid(self):
        overrides = {
            'REDASH_SAML_METADATA_URL': 'http://example.com/saml-metadata.xml',
            'REDASH_SAML_WANT_ASSERTIONS_SIGNED': 'false',
            'REDASH_SAML_WANT_RESPONSE_SIGNED': 'false'
        }

        # Make sure the configuration is reloaded without these
        # modifications once we are done
        self.addCleanup(lambda: reload(organization))

        with mock.patch.dict('os.environ', overrides):
            with self.assertRaises(SystemExit):
                reload(organization)
