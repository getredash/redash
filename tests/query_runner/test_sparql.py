from unittest import TestCase

from redash.query_runner.corporate_memory import CorporateMemoryQueryRunner
from redash.query_runner.sparql_endpoint import SPARQLEndpointQueryRunner

# SPARQL 1.1 Query Results JSON Format, as returned by the endpoint.
RESULTS = """{
    "head": {"vars": ["name", "age"]},
    "results": {"bindings": [
        {"name": {"type": "literal", "value": "Alice"}, "age": {"type": "literal", "value": "42"}},
        {"name": {"type": "literal", "value": "Bob"}}
    ]}
}"""

EXPECTED = {
    "columns": [
        {"name": "name", "friendly_name": "name", "type": "string"},
        {"name": "age", "friendly_name": "age", "type": "string"},
    ],
    "rows": [{"name": "Alice", "age": "42"}, {"name": "Bob", "age": ""}],
}


class TestTransformSparqlResults(TestCase):
    def test_corporate_memory(self):
        self.assertEqual(EXPECTED, CorporateMemoryQueryRunner._transform_sparql_results(RESULTS))

    def test_sparql_endpoint(self):
        self.assertEqual(EXPECTED, SPARQLEndpointQueryRunner._transform_sparql_results(RESULTS))
