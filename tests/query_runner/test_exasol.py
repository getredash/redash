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

    def test_verifies_certificate_when_option_is_missing(self, connect):
        Exasol(CONFIGURATION)._get_connection()
        self.assertEqual({"cert_reqs": ssl.CERT_REQUIRED}, connect.call_args.kwargs["websocket_sslopt"])

    def test_verification_can_be_turned_off(self, connect):
        Exasol(dict(CONFIGURATION, verify_ssl=False))._get_connection()
        self.assertEqual({"cert_reqs": ssl.CERT_NONE}, connect.call_args.kwargs["websocket_sslopt"])
