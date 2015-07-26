import datetime
import json
import logging
import sys
import urllib

from redash.query_runner import *
from redash import models

import requests
import dateutil
from dateutil.parser import parse

try:
    import http.client as http_client
except ImportError:
    # Python 2
    import httplib as http_client

logger = logging.getLogger(__name__)

ELASTICSEARCH_TYPES_MAPPING = {
    "integer" : TYPE_INTEGER,
    "long" : TYPE_INTEGER,
    "float" : TYPE_FLOAT,
    "double" : TYPE_FLOAT,
    "boolean" : TYPE_BOOLEAN,
    "string" : TYPE_STRING,
    "date" : TYPE_DATE,
    # "geo_point" TODO: Need to split to 2 fields somehow
}

PYTHON_TYPES_MAPPING = {
    str: TYPE_STRING,
    unicode: TYPE_STRING,
    bool : TYPE_BOOLEAN,
    int : TYPE_INTEGER,
    long: TYPE_INTEGER,
    float: TYPE_FLOAT
}

#
# ElasticSearch currently supports only simple Lucene style queries (like Kibana
# but without the aggregation).
#
# Full blown JSON based ElasticSearch queries (including aggregations) will be
# added later
#
# Simple query example:
#
# - Query the index named "twitter"
# - Filter by "user:kimchy"
# - Return the fields: "@timestamp", "tweet" and "user"
# - Return up to 15 results
# - Sort by @timestamp ascending
#
# {
#     "index" : "twitter",
#     "query" : "user:kimchy",
#     "fields" : ["@timestamp", "tweet", "user"],
#     "size" : 15,
#     "sort" : "@timestamp:asc"
# }
#
#
# Simple query on a logstash ElasticSearch instance:
#
# - Query the index named "logstash-2015.04.*" (in this case its all of April 2015)
# - Filter by type:events AND eventName:UserUpgrade AND channel:selfserve
# - Return fields: "@timestamp", "userId", "channel", "utm_source", "utm_medium", "utm_campaign", "utm_content"
# - Return up to 250 results
# - Sort by @timestamp ascending

# {
#     "index" : "logstash-2015.04.*",
#     "query" : "type:events AND eventName:UserUpgrade AND channel:selfserve",
#     "fields" : ["@timestamp", "userId", "channel", "utm_source", "utm_medium", "utm_campaign", "utm_content"],
#     "size" : 250,
#     "sort" : "@timestamp:asc"
# }
#
#

class ElasticSearch(BaseQueryRunner):
    DEBUG_ENABLED = False

    """
    ElastichSearch query runner for querying ElasticSearch servers.
    Query can be done using the Lucene Syntax (single line) or the more complex,
    full blown ElasticSearch JSON syntax
    """
    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'server': {
                    'type': 'string',
                    'title': 'Base URL'
                }
            },
            "required" : ["server"]
        }

    @classmethod
    def enabled(cls):
        return True

    @classmethod
    def annotate_query(cls):
        return False

    def __init__(self, configuration_json):
        super(ElasticSearch, self).__init__(configuration_json)

        self.syntax = "json"

        if self.DEBUG_ENABLED:
            http_client.HTTPConnection.debuglevel = 1
            
            # you need to initialize logging, otherwise you will not see anything from requests
            logging.basicConfig()
            logging.getLogger().setLevel(logging.DEBUG)
            requests_log = logging.getLogger("requests.packages.urllib3")
            requests_log.setLevel(logging.DEBUG)
            requests_log.propagate = True

    def get_mappings(self, url):
        mappings = {}

        r = requests.get(url)
        mappings_data = r.json()
        for index_name in mappings_data:
            index_mappings = mappings_data[index_name]
            for m in index_mappings.get("mappings", {}):
                for property_name in index_mappings["mappings"][m]["properties"]:
                    property_data = index_mappings["mappings"][m]["properties"][property_name]
                    if not property_name in mappings:
                        property_type = property_data.get("type", None)
                        if property_type:
                            if property_type in ELASTICSEARCH_TYPES_MAPPING:
                                mappings[property_name] = property_type
                            else:
                                raise "Unknown property type: {0}".format(property_type)

        return mappings

    def parse_results(self, mappings, result_fields, raw_result, result_columns, result_rows):
        result_columns_index = {}
        for c in result_columns:
            result_columns_index[c["name"]] = c

        result_fields_index = {}
        if result_fields:
            for r in result_fields:
                result_fields_index[r] = None

        for h in raw_result["hits"]["hits"]:
            row = {}
            for column in h["_source"]:
                if result_fields and column not in result_fields_index:
                    continue

                if column not in result_columns_index:
                    result_columns.append({
                        "name" : column,
                        "friendly_name" : column,
                        "type" : mappings.get(column, "string")
                    })
                    result_columns_index[column] = result_columns[-1]

                row[column] = h["_source"][column]

            if row and len(row) > 0:
                result_rows.append(row)

    def execute_simple_query(self, url, _from, mappings, result_fields, result_columns, result_rows):
        url += "&from={0}".format(_from)
        r = requests.get(url)
        if r.status_code != 200:
            raise Exception("Failed to execute query. Return Code: {0}   Reason: {1}".format(r.status_code, r.text))

        raw_result = r.json()

        self.parse_results(mappings, result_fields, raw_result, result_columns, result_rows)

        total = raw_result["hits"]["total"]
        result_size = len(raw_result["hits"]["hits"])
        logger.debug("Result Size: {0}  Total: {1}".format(result_size, total))

        return raw_result["hits"]["total"]

    def run_query(self, query):
        try:
            error = None

            logger.debug(query)
            query_params = json.loads(query)

            index_name = query_params["index"]
            query_data = query_params["query"]
            size = int(query_params.get("size", 500))
            result_fields = query_params.get("fields", None)
            sort = query_params.get("sort", None)

            server_url = self.configuration["server"]
            if not server_url:
                error = "Missing configuration key 'server'"
                return None, error


            if server_url[-1] == "/":
                server_url = server_url[:-1]

            url = "{0}/{1}/_search?".format(server_url, index_name)
            mapping_url = "{0}/{1}/_mapping".format(server_url, index_name)

            mappings = self.get_mappings(mapping_url)

            logger.debug(json.dumps(mappings, indent=4))

            if size:
                url += "&size={0}".format(size)

            if sort:
                url += "&sort={0}".format(urllib.quote_plus(sort))

            url += "&q={0}".format(urllib.quote_plus(query_data))

            logger.debug("Using URL: {0}".format(url))
            logger.debug("Using Query: {0}".format(query_data))

            result_columns = []
            result_rows = []
            if isinstance(query_data, str) or isinstance(query_data, unicode):
                _from = 0
                while True:
                    total = self.execute_simple_query(url, _from, mappings, result_fields, result_columns, result_rows)
                    _from += size
                    if _from >= total:
                        break
            else:
                # TODO: Handle complete ElasticSearch queries (JSON based sent over HTTP POST)
                raise Exception("Advanced queries are not supported")

            json_data = json.dumps({
                "columns" : result_columns,
                "rows" : result_rows
            })
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        except Exception as e:
            raise sys.exc_info()[1], None, sys.exc_info()[2]

        return json_data, error


register(ElasticSearch)
