import ssl
from unittest import TestCase

import mock

from redash.query_runner.exasol import Exasol

CONFIGURATION = {"host": "exasol.example.com", "port": 8563, "user": "sys", "password": "exasol"}


@mock.patch("redash.query_runner.exasol.pyexasol.connect")
class TestExasolConnection(TestCase):
    def test_verifies_certificate_when_enabled(self, connect):
        Exasol(dict(CONFIGURATION, verify_ssl=True))._get_connection()
        self.assertEqual({"cert_reqs": ssl.CERT_REQUIRED}, connect.call_args.kwargs["websocket_sslopt"])

    def test_existing_data_sources_keep_skipping_verification(self, connect):
        Exasol(CONFIGURATION)._get_connection()
        self.assertEqual({"cert_reqs": ssl.CERT_NONE}, connect.call_args.kwargs["websocket_sslopt"])

    def test_new_data_sources_verify_by_default(self, connect):
        self.assertTrue(Exasol.configuration_schema()["properties"]["verify_ssl"]["default"])
