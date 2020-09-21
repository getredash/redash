import shutil
import ssl
from unittest import TestCase

from cassandra.cqltypes import UTF8Type
from cassandra.util import OrderedMapSerializedKey

from redash.query_runner.cass import generate_ssl_options_dict, CassandraJSONEncoder
from redash.utils import json_dumps

class TestCassandra(TestCase):

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

    def test_cass_json_encoder_1(self):
        om = OrderedMapSerializedKey(UTF8Type, 2)

        try:
            json_data = json_dumps(om, cls=CassandraJSONEncoder)
            self.assertEqual(json_data, {})
        except Exception as e:
            self.fail(repr(e))