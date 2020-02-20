import shutil
import ssl
from pathlib import Path
from unittest import TestCase

from redash.query_runner.cass import generate_cert_file, generate_ssl_options_dict


class TestCassandra(TestCase):

    def tearDownClass():
        shutil.rmtree("./tmp", ignore_errors=True)

    def test_generate_cert_file_creates_a_file_with_right_path(self):
        expected = "./tmp/cassandra_certificate/test_host/cert.pem"
        actual = generate_cert_file(b"test_cert_string", "test_host")
        self.assertEqual(expected, actual)

    def test_generate_cert_file_creates_a_file_that_exists(self):
        actual = generate_cert_file(b"test_cert_string", "another_host")
        self.assertEqual(True, Path(actual).exists())

    def test_generate_cert_file_creates_a_file_with_right_content(self):
        expected = "test_cert_string"
        actual_path = generate_cert_file(b"test_cert_string", "content_host")
        with open(actual_path, "r") as f:
            actual = f.read()
        self.assertEqual(expected, actual)

    def test_generate_ssl_options_dict_creates_plain_protocol_dict(self):
        expected = {'ssl_version': ssl.PROTOCOL_TLSv1_2}
        actual = generate_ssl_options_dict("PROTOCOL_TLSv1_2")
        self.assertDictEqual(expected, actual)

    def test_generate_ssl_options_dict_creates_certificate_dict(self):
        expected = {
            'ssl_version': ssl.PROTOCOL_TLSv1_2,
            'ca_certs': 'some/path',
            'cert_reqs': ssl.CERT_REQUIRED,
        }
        actual = generate_ssl_options_dict("PROTOCOL_TLSv1_2", "some/path")
        self.assertDictEqual(expected, actual)
