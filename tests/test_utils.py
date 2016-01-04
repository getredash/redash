from redash.utils import build_url
from collections import namedtuple
from unittest import TestCase

DummyRequest = namedtuple('DummyRequest', ['host', 'scheme'])


class TestBuildUrl(TestCase):
    def test_simple_case(self):
        self.assertEqual("http://example.com/test", build_url(DummyRequest("", "http"), "example.com", "/test"))

    def test_uses_current_request_port(self):
        self.assertEqual("http://example.com:5000/test", build_url(DummyRequest("example.com:5000", "http"), "example.com", "/test"))

    def test_uses_current_request_schema(self):
        self.assertEqual("https://example.com/test", build_url(DummyRequest("example.com", "https"), "example.com", "/test"))

    def test_skips_port_for_default_ports(self):
        self.assertEqual("https://example.com/test", build_url(DummyRequest("example.com:443", "https"), "example.com", "/test"))
        self.assertEqual("http://example.com/test", build_url(DummyRequest("example.com:80", "http"), "example.com", "/test"))
        self.assertEqual("https://example.com:80/test", build_url(DummyRequest("example.com:80", "https"), "example.com", "/test"))
        self.assertEqual("http://example.com:443/test", build_url(DummyRequest("example.com:443", "http"), "example.com", "/test"))

    # CALL LIOR!!!
