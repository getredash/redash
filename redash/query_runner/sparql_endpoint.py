"""Provide the query runner for SPARQL Endpoints.

seeAlso: https://www.w3.org/TR/rdf-sparql-query/
"""

import json
import logging
from os import environ

from redash.query_runner import BaseQueryRunner

from . import register

try:
    import requests
    from cmem.cmempy.queries import SparqlQuery
    from rdflib.plugins.sparql import prepareQuery  # noqa

    enabled = True
except ImportError:
    enabled = False

logger = logging.getLogger(__name__)


class SPARQLEndpointQueryRunner(BaseQueryRunner):
    """Use SPARQL Endpoint as redash data source"""

    # These environment keys are used by cmempy
    KNOWN_CONFIG_KEYS = ("SPARQL_BASE_URI", "SSL_VERIFY")

    # These variables hold secret data and should NOT be logged
    KNOWN_SECRET_KEYS = ()

    # This allows for an easy connection test
    noop_query = "SELECT ?noop WHERE {BIND('noop' as ?noop)}"

    def __init__(self, configuration):
        """init the class and configuration"""
        super(SPARQLEndpointQueryRunner, self).__init__(configuration)

        self.configuration = configuration

    def _setup_environment(self):
        """provide environment for rdflib

        rdflib environment variables need to match key in the properties
        object of the configuration_schema
        """
        for key in self.KNOWN_CONFIG_KEYS:
            if key in environ:
                environ.pop(key)
            value = self.configuration.get(key, None)
            if value is not None:
                environ[key] = str(value)
                if key in self.KNOWN_SECRET_KEYS:
                    logger.info("{} set by config".format(key))
                else:
                    logger.info("{} set by config to {}".format(key, environ[key]))

    @staticmethod
    def _transform_sparql_results(results):
        """transforms a SPARQL query result to a redash query result

        source structure: SPARQL 1.1 Query Results JSON Format
            - seeAlso: https://www.w3.org/TR/sparql11-results-json/

        target structure: redash result set
            there is no good documentation available
            so here an example result set as needed for redash:
            data = {
                "columns": [ {"name": "name", "type": "string", "friendly_name": "friendly name"}],
                "rows": [
                    {"name": "value 1"},
                    {"name": "value 2"}
                ]}

        FEATURE?: During the sparql_row loop, we could check the data types of the
            values and, in case they are all the same, choose something better than
            just string.
        """
        logger.info("results are: {}".format(results))
        # Not sure why we do not use the json package here but all other
        # query runner do it the same way :-)
        sparql_results = results
        # transform all bindings to redash rows
        rows = []
        for sparql_row in sparql_results["results"]["bindings"]:
            row = {}
            for var in sparql_results["head"]["vars"]:
                try:
                    row[var] = sparql_row[var]["value"]
                except KeyError:
                    # not bound SPARQL variables are set as empty strings
                    row[var] = ""
            rows.append(row)
        # transform all vars to redash columns
        columns = []
        for var in sparql_results["head"]["vars"]:
            columns.append({"name": var, "friendly_name": var, "type": "string"})
        # Not sure why we do not use the json package here but all other
        # query runner do it the same way :-)
        return {"columns": columns, "rows": rows}

    @classmethod
    def name(cls):
        return "SPARQL Endpoint"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def type(cls):
        return "sparql_endpoint"

    def remove_comments(self, string):
        return string[string.index("*/") + 2 :].strip()

    def run_query(self, query, user):
        """send a query to a sparql endpoint"""
        logger.info("about to execute query (user='{}'): {}".format(user, query))
        query_text = self.remove_comments(query)
        query = SparqlQuery(query_text)
        query_type = query.get_query_type()
        if query_type not in ["SELECT", None]:
            raise ValueError("Queries of type {} can not be processed by redash.".format(query_type))

        self._setup_environment()
        try:
            endpoint = self.configuration.get("SPARQL_BASE_URI")
            r = requests.get(
                endpoint,
                params=dict(query=query_text),
                headers=dict(Accept="application/json"),
            )
            data = self._transform_sparql_results(r.text)
        except Exception as error:
            logger.info("Error: {}".format(error))
            try:
                # try to load Problem Details for HTTP API JSON
                details = json.loads(error.response.text)
                error = ""
                if "title" in details:
                    error += details["title"] + ": "
                if "detail" in details:
                    error += details["detail"]
                    return None, error
            except Exception:
                pass

            return None, error

        error = None
        return data, error

    @classmethod
    def configuration_schema(cls):
        """provide the configuration of the data source as json schema"""
        return {
            "type": "object",
            "properties": {
                "SPARQL_BASE_URI": {"type": "string", "title": "Base URL"},
                "SSL_VERIFY": {
                    "type": "boolean",
                    "title": "Verify SSL certificates for API requests",
                    "default": True,
                },
            },
            "required": ["SPARQL_BASE_URI"],
            "secret": [],
            "extra_options": ["SSL_VERIFY"],
        }

    def get_schema(self, get_stats=False):
        """Get the schema structure (prefixes, graphs)."""
        schema = dict()
        schema["1"] = {
            "name": "-> Common Prefixes <-",
            "columns": self._get_common_prefixes_schema(),
        }
        schema["2"] = {"name": "-> Graphs <-", "columns": self._get_graphs_schema()}
        # schema.update(self._get_query_schema())
        logger.info(f"Getting Schema Values: {schema.values()}")
        return schema.values()

    def _get_graphs_schema(self):
        """Get a list of readable graph FROM clause strings."""
        self._setup_environment()
        endpoint = self.configuration.get("SPARQL_BASE_URI")
        query_text = "SELECT DISTINCT ?g WHERE {GRAPH ?g {?s ?p ?o}}"
        r = requests.get(
            endpoint,
            params=dict(query=query_text),
            headers=dict(Accept="application/json"),
        ).json()
        graph_iris = [g.get("g").get("value") for g in r.get("results").get("bindings")]
        graphs = []
        for graph in graph_iris:
            graphs.append("FROM <{}>".format(graph))
        return graphs

    @staticmethod
    def _get_common_prefixes_schema():
        """Get a list of SPARQL prefix declarations."""
        common_prefixes = [
            "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>",
            "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>",
            "PREFIX owl: <http://www.w3.org/2002/07/owl#>",
            "PREFIX schema: <http://schema.org/>",
            "PREFIX dct: <http://purl.org/dc/terms/>",
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>",
        ]
        return common_prefixes


register(SPARQLEndpointQueryRunner)
