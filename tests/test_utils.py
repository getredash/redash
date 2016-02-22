from redash.utils import build_url, collect_query_parameters, collect_parameters_from_request
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


class TestCollectParametersFromQuery(TestCase):
    def test_returns_empty_list_for_regular_query(self):
        query = u"SELECT 1"
        self.assertEqual([], collect_query_parameters(query))

    def test_finds_all_params(self):
        query = u"SELECT {{param}} FROM {{table}}"
        params = ['param', 'table']
        self.assertEqual(params, collect_query_parameters(query))

    def test_deduplicates_params(self):
        query = u"SELECT {{param}}, {{param}} FROM {{table}}"
        params = ['param', 'table']
        self.assertEqual(params, collect_query_parameters(query))

    def test_handles_nested_params(self):
        query = u"SELECT {{param}}, {{param}} FROM {{table}} -- {{#test}} {{nested_param}} {{/test}}"
        params = ['param', 'table', 'test', 'nested_param']
        self.assertEqual(params, collect_query_parameters(query))


class TestCollectParametersFromRequest(TestCase):
    def test_ignores_non_prefixed_values(self):
        self.assertEqual({}, collect_parameters_from_request({'test': 1}))

    def test_takes_prefixed_values(self):
        self.assertDictEqual({'test': 1, 'something_else': 'test'}, collect_parameters_from_request({'p_test': 1, 'p_something_else': 'test'}))
