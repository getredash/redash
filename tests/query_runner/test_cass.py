import datetime
import shutil
import ssl
from unittest import TestCase

from cassandra.cqltypes import UTF8Type
from cassandra.util import OrderedMapSerializedKey, Date, Time

from redash.query_runner.cass import generate_ssl_options_dict, CassandraJSONEncoder
from redash.utils import json_dumps, json_loads

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
            json_obj = json_loads(json_data)
            self.assertEqual(json_obj, {})
        except Exception as e:
            self.fail(repr(e))

    def test_cass_json_encoder_2(self):
        expected_date = datetime.date(2020, 9, 22)
        cass_date = Date(expected_date)

        try:
            json_data = json_dumps(cass_date, cls=CassandraJSONEncoder)
            json_obj = json_loads(json_data)
            self.assertEqual(json_obj, expected_date.isoformat())
        except Exception as e:
            self.fail(repr(e))

    def test_cass_json_encoder_3(self):
        cass_time = Time("00:00:00.000000001")

        try:
            json_data = json_dumps(cass_time, cls=CassandraJSONEncoder)
            json_obj = json_loads(json_data)
            self.assertEqual(json_obj, "00:00:00")
        except Exception as e:
            self.fail(repr(e))
    