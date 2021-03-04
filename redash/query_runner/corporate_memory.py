"""Provide the query runner for eccenca Corporate Memory.

seeAlso: https://documentation.eccenca.com/
seeAlso: https://eccenca.com/
"""

import logging
import json
from os import environ

from redash.query_runner import BaseQueryRunner
from redash.utils import json_dumps, json_loads
from . import register

try:
    from cmem.cmempy.queries import (
        SparqlQuery,
        QueryCatalog,
        QUERY_STRING
    )
    from cmem.cmempy.dp.proxy.graph import get_graphs_list
    enabled = True
except ImportError:
    enabled = False

logger = logging.getLogger(__name__)


class CorporateMemoryQueryRunner(BaseQueryRunner):
    """Use eccenca Corporate Memory as redash data source"""

    # These environment keys are used by cmempy
    KNOWN_CONFIG_KEYS = (
        'CMEM_BASE_PROTOCOL',
        'CMEM_BASE_DOMAIN',
        'CMEM_BASE_URI',
        'SSL_VERIFY',
        'REQUESTS_CA_BUNDLE',
        'DP_API_ENDPOINT',
        'DI_API_ENDPOINT',
        'OAUTH_TOKEN_URI',
        'OAUTH_GRANT_TYPE',
        'OAUTH_USER',
        'OAUTH_PASSWORD',
        'OAUTH_CLIENT_ID',
        'OAUTH_CLIENT_SECRET'
    )

    # These variables hold secret data and should be logged
    KNOWN_SECRET_KEYS = (
        'OAUTH_PASSWORD',
        'OAUTH_CLIENT_SECRET'
    )

    # This allows for an easy connection test
    noop_query = "SELECT ?noop WHERE {BIND('noop' as ?noop)}"

    # We do not want to have comment in our sparql queries
    # TODO?: Implement annotate_query in case the metadata is useful somewhere
    should_annotate_query = False

    def __init__(self, configuration):
        """init the class and configuration"""
        super(CorporateMemoryQueryRunner, self).__init__(configuration)
        """
        TODO: activate SPARQL support in the redash query editor
            Currently SPARQL syntax seems not to be available for react-ace
            component. However, the ace editor itself supports sparql mode:
            https://github.com/ajaxorg/ace/blob/master/lib/ace/mode/sparql.js
            then we can hopefully do: self.syntax = "sparql"

        TODO: implement the retrieve Query catalog URIs in order to use them in queries

        TODO?: implement a way to use queries from the query catalog

        TODO: allow a checkbox to NOT use owl:imports imported graphs

        TODO: allow to use a context graph per data source
        """
        self.configuration = configuration

    def _setup_environment(self):
        """provide environment for cmempy

        cmempy environment variables need to match key in the properties
        object of the configuration_schema
        """
        for key in self.KNOWN_CONFIG_KEYS:
            if key in environ:
                environ.pop(key)
            value = self.configuration.get(key, None)
            if value is not None:
                environ[key] = value
                if key in self.KNOWN_SECRET_KEYS:
                    logger.info(
                        "{} set by config".format(key)
                    )
                else:
                    logger.info(
                        "{} set by config to {}".format(key, environ[key])
                    )

    def _transform_sparql_results(self, results):
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

        TODO?: During the sparql_row loop, we could check the datatypes of the
            values and, in case they are all the same, choose something better than
            just string.
        """
        logger.info("results are: {}".format(results))
        # Not sure why we do not use the json package here but all other
        # query runner do it the same way :-)
        sparql_results = json_loads(results)
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
            columns.append(
                {
                    "name": var,
                    "friendly_name": var,
                    "type": "string"
                }
            )
        # Not sure why we do not use the json package here but all other
        # query runner do it the same way :-)
        return json_dumps({"columns": columns, "rows": rows})

    @classmethod
    def name(cls):
        return "eccenca Corporate Memory (SPARQL)"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def type(cls):
        return "corporate_memory"

    def run_query(self, query, user):
        """send a sparql query to corporate memory

        TODO: between _setup_environment and .get_results call there is a
                possible race condition which should be avoided
        """
        query_text = query
        logger.info("about to execute query (user='{}'): {}"
                    .format(user, query_text))
        query = SparqlQuery(query_text)
        query_type = query.get_query_type()
        # type of None means, there is an error in the query
        # so execution is at least tried on endpoint
        if query_type not in ["SELECT", None]:
            raise ValueError(
                "Queries of type {} can not be processed by redash."
                .format(query_type)
            )

        self._setup_environment()
        try:
            data = self._transform_sparql_results(
                query.get_results()
            )
        except Exception as error:
            logger.info("Error: {}".format(error))
            try:
                # try to load Problem Details for HTTP API JSON
                details = json.loads(error.response.text)
                error = ""
                if 'title' in details:
                    error += details["title"] + ": "
                if 'detail' in details:
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
                "CMEM_BASE_URI": {
                    "type": "string",
                    "title": "CMEM_BASE_URL"
                },
                "OAUTH_GRANT_TYPE": {
                    "type": "string",
                    "title": "OAUTH_GRANT_TYPE (can be: password or client_credentials)",
                    "default": "client_credentials"
                },
                "OAUTH_CLIENT_ID": {
                    "type": "string",
                    "title": "OAUTH_CLIENT_ID (e.g. cmem-service-account)",
                    "default": "cmem-service-account"
                },
                "OAUTH_CLIENT_SECRET": {
                    "type": "string",
                    "title": "OAUTH_CLIENT_SECRET - only needed for grant type 'client_credentials'",
                },
                "OAUTH_USER": {
                    "type": "string",
                    "title": "OAUTH_USER (e.g. admin) - only needed for grant type 'password'"
                },
                "OAUTH_PASSWORD": {
                    "type": "string",
                    "title": "OAUTH_PASSWORD - only needed for grant type 'password'"
                },
                "SSL_VERIFY": {
                    "type": "string",
                    "title": "SSL_VERIFY - Verify SSL certs for API requests",
                    "default": "true"
                },
                "REQUESTS_CA_BUNDLE": {
                    "type": "string",
                    "title": "REQUESTS_CA_BUNDLE - Path to the CA Bundle file (.pem)"
                },
            },
            "required": ["CMEM_BASE_URI", "OAUTH_GRANT_TYPE", "OAUTH_CLIENT_ID"],
            "secret": ["OAUTH_CLIENT_SECRET"]
        }

    def get_schema(self, get_stats=False):
        """Get the schema structure (prefixes, graphs)."""
        schema = dict()
        schema["1"] = {
            'name': "-> Common Prefixes <-",
            'columns': self._get_common_prefixes_schema()
        }
        schema["2"] = {
            'name': "-> Graphs <-",
            'columns': self._get_graphs_schema()
        }
        #schema.update(self._get_query_schema())
        logger.info(schema.values())
        return schema.values()

    def _get_query_schema(self):
        """Return the query parts of the schema."""
        schema = dict()
        self._setup_environment()
        query_catalog = QueryCatalog()
        query_index = 0
        #logger.info(str(QUERY_STRING))
        for _, query in query_catalog.get_queries().items():
            logger.info("------> " + str(query.label))
            logger.info(str(query.get_query_type()))
            logger.info(str(query.short_url))
            logger.info(str(query.text))
            logger.info(type(query.get_placeholder_keys()))
            logger.info(str(query.get_placeholder_keys()))
            if query.get_query_type() in ["SELECT", None]:
                schema_index = "q{}".format(query_index)
                columns = ["LOAD_QUERY={}".format(query.short_url)]
                for parameter in query.get_placeholder_keys():
                    logger.info(type(parameter))
                    columns.append(
                        parameter + "={{" + parameter + "}}"
                    )
                logger.info(columns)
                schema[schema_index] = {
                    'name': query.label,
                    'columns': columns
                }
                query_index += 1
        return schema

    def _get_graphs_schema(self):
        """Get a list of readable graph FROM clause strings."""
        self._setup_environment()
        graphs = []
        for graph in get_graphs_list():
            graphs.append(
                "FROM <{}>".format(graph["iri"])
            )
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
            "PREFIX skos: <http://www.w3.org/2004/02/skos/core#>"
        ]
        return common_prefixes


register(CorporateMemoryQueryRunner)
