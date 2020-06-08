import logging
import sys
import urllib.request
import urllib.parse
import urllib.error

import requests
from requests.auth import HTTPBasicAuth
from typing import Tuple, Optional

from redash.query_runner import *
from redash.utils import json_dumps, json_loads

try:
    import http.client as http_client
except ImportError:
    # Python 2
    import http.client as http_client

logger = logging.getLogger(__name__)

ELASTICSEARCH_TYPES_MAPPING = {
    "integer": TYPE_INTEGER,
    "long": TYPE_INTEGER,
    "float": TYPE_FLOAT,
    "double": TYPE_FLOAT,
    "boolean": TYPE_BOOLEAN,
    "string": TYPE_STRING,
    "date": TYPE_DATE,
    "object": TYPE_STRING,
    # "geo_point" TODO: Need to split to 2 fields somehow
}

ELASTICSEARCH_BUILTIN_FIELDS_MAPPING = {"_id": "Id", "_score": "Score"}

PYTHON_TYPES_MAPPING = {
    str: TYPE_STRING,
    bytes: TYPE_STRING,
    bool: TYPE_BOOLEAN,
    int: TYPE_INTEGER,
    float: TYPE_FLOAT,
}

class BaseElasticSearch(BaseQueryRunner):
    should_annotate_query = False
    DEBUG_ENABLED = False

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "server": {"type": "string", "title": "Base URL"},
                "basic_auth_user": {"type": "string", "title": "Basic Auth User"},
                "basic_auth_password": {
                    "type": "string",
                    "title": "Basic Auth Password",
                },
            },
            "order": ["server", "basic_auth_user", "basic_auth_password"],
            "secret": ["basic_auth_password"],
            "required": ["server"],
        }

    @classmethod
    def enabled(cls):
        return False

    def __init__(self, configuration):
        super(BaseElasticSearch, self).__init__(configuration)
        self.syntax = "json"

        if self.DEBUG_ENABLED:
            http_client.HTTPConnection.debuglevel = 1

            # you need to initialize logging, otherwise you will not see anything from requests
            logging.basicConfig()
            logging.getLogger().setLevel(logging.DEBUG)
            requests_log = logging.getLogger("requests.packages.urllib3")
            requests_log.setLevel(logging.DEBUG)
            requests_log.propagate = True

            logger.setLevel(logging.DEBUG)

        self.server_url = self.configuration["server"]
        if self.server_url[-1] == "/":
            self.server_url = self.server_url[:-1]

        basic_auth_user = self.configuration.get("basic_auth_user", None)
        basic_auth_password = self.configuration.get("basic_auth_password", None)
        self.auth = None
        if basic_auth_user and basic_auth_password:
            self.auth = HTTPBasicAuth(basic_auth_user, basic_auth_password)

    def get_response(self, url, http_method='get', **kwargs):
        url = "{}{}".format(self.server_url, url)
        headers = kwargs.pop('headers', {})
        headers['Accept'] = 'application/json'

        # Then call requests to get the response from the given endpoint
        # URL optionally, with the additional requests parameters.
        error = None
        response = None
        try:
            response = requests.request(http_method, url, auth=self.auth, headers=headers, **kwargs)
            # Raise a requests HTTP exception with the appropriate reason
            # for 4xx and 5xx response status codes which is later caught
            # and passed back.
            response.raise_for_status()

            # Any other responses (e.g. 2xx and 3xx):
            if response.status_code != 200:
                error = "Endpoint returned unexpected status code ({}).".format(response.status_code)

        except requests.HTTPError as exc:
            logger.exception(exc)
            error = "Failed to execute query. " "Return Code: {} Reason: {}".format(
                response.status_code, response.text
            )
        except requests.RequestException as exc:
            # Catch all other requests exceptions and return the error.
            logger.exception(exc)
            error = str(exc)

        # Return response and error.
        return response, error

    def _get_mappings(self, url):
        response, error = self.get_response(url)
        if error is None:
            return response.json(), None
        else:
            return {}, error

    def _get_query_mappings(self, url):
        mappings_data, error = self._get_mappings(url)
        if error:
            return mappings_data, error
        mappings = self._parse_mappings(mappings_data)
        return mappings, error

    def test_connection(self):
        _, error = self.get_response("/_cluster/health")
        if error is not None:
            raise Exception(error)

    def run_query(self, query, user):
        index, query, url, result_fields = self._build_query(query)
        mappings = {}
        if index:
            mapping_url = "/{0}/_mapping".format(index)
            mappings, error = self._get_query_mappings(mapping_url)
            if error:
                return None, error

        response, error = self.get_response(url, http_method='post', json=query)
        if error:
            return None, error
        raw_result = response.json()

        result_columns = []
        result_rows = []
        self._parse_results(mappings, result_fields, raw_result, result_columns, result_rows)
        json_data = json_dumps({"columns": result_columns, "rows": result_rows})
        error = None
        return json_data, error

    def _build_query(self, query: str) -> Tuple[dict, str, Optional[list]]:
        query = json_loads(query)
        index_name = query.pop('index', None)
        result_fields = query.pop('_source', None)
        url = "/{}/_search".format(index_name) if index_name else "/_search"
        return index_name, query, url, result_fields

    @classmethod
    def _parse_mappings(cls, mappings_data: dict):
        mappings = {}

        def _parse_properties(prefix: str, properties: dict):
            for property_name, property_data in properties.items():
                if property_name not in mappings:
                    property_type = property_data.get('type', None)
                    nested_properties = property_data.get('properties', None)
                    if property_type:
                        mappings[index_name][prefix + property_name] = (
                            ELASTICSEARCH_TYPES_MAPPING.get(property_type, TYPE_STRING)
                        )
                    elif nested_properties:
                        new_prefix = prefix + property_name + '.'
                        _parse_properties(new_prefix, nested_properties)

        for index_name in mappings_data:
            mappings[index_name] = {}
            index_mappings = mappings_data[index_name]
            _parse_properties('', index_mappings['mappings']['properties'])

        return mappings

    def get_schema(self, *args, **kwargs):
        schema = {}
        mappings, error = self._get_query_mappings('/_mappings')
        if mappings:
            for name, columns in mappings.items():
                schema[name] = {
                    'name': name,
                    'columns': list(columns.keys())
                }
        return list(schema.values())

    @classmethod
    def _parse_results(cls, mappings, result_fields, raw_result, result_columns, result_rows):
        result_columns_index = {c["name"]: c for c in result_columns}
        result_fields_index = {}

        def add_column_if_needed(column_name, value=None):
            if column_name not in result_columns_index:
                result_columns.append({
                    'name': column_name,
                    'friendly_name': column_name,
                    'type': PYTHON_TYPES_MAPPING.get(type(value), TYPE_STRING)
                })
                result_columns_index[column_name] = result_columns[-1]

        def get_row(rows, row):
            if row is None:
                row = {}
                rows.append(row)
            return row

        def collect_value(row, key, value):
            if result_fields and key not in result_fields_index:
                return

            add_column_if_needed(key, value)
            row[key] = value

        def parse_bucket_to_row(data, row, agg_key):
            sub_agg_key = ""
            for key, item in data.items():
                if key == 'key_as_string':
                    continue
                if key == 'key':
                    if 'key_as_string' in data:
                        collect_value(row, agg_key, data['key_as_string'])
                    else:
                        collect_value(row, agg_key, data['key'])
                    continue

                if isinstance(item, (str, int, float)):
                    collect_value(row, agg_key + '.' + key, item)
                elif isinstance(item, dict):
                    if 'buckets' not in item:
                        for sub_key, sub_item in item.items():
                            collect_value(
                                row,
                                agg_key + '.' + key + '.' + sub_key,
                                sub_item,
                            )
                    else:
                        sub_agg_key = key

            return sub_agg_key

        def parse_buckets_list(rows, parent_key, data, row, depth):
            if len(rows) > 0 and depth == 0:
                row = rows.pop()

            for value in data:
                row = row.copy()
                sub_agg_key = parse_bucket_to_row(value, row, parent_key)

                if sub_agg_key == "":
                    rows.append(row)
                else:
                    depth += 1
                    parse_buckets_list(rows, sub_agg_key, value[sub_agg_key]['buckets'], row, depth)

        def collect_aggregations(rows, parent_key, data, row, depth):
            row = get_row(rows, row)
            parse_bucket_to_row(data, row, parent_key)

            if 'buckets' in data:
                parse_buckets_list(rows, parent_key, data['buckets'], row, depth)

            return None

        def get_flatten_results(dd, separator='.', prefix=''):
            if isinstance(dd, dict):
                return {
                    prefix + separator + k if prefix else k: v
                    for kk, vv in dd.items()
                    for k, v in get_flatten_results(vv, separator, kk).items()
                }
            elif isinstance(dd, list) and len(dd) == 1:
                return {prefix: dd[0]}
            else:
                return {prefix: dd}

        if result_fields:
            for r in result_fields:
                result_fields_index[r] = None

        if 'error' in raw_result:
            error = raw_result['error']
            if len(error) > 10240:
                error = error[:10240] + '... continues'

            raise Exception(error)
        elif 'aggregations' in raw_result:
            for key, data in raw_result["aggregations"].items():
                collect_aggregations(result_rows, key, data, None, 0)

        elif 'hits' in raw_result and 'hits' in raw_result['hits']:
            for h in raw_result["hits"]["hits"]:
                row = {}

                fields_parameter_name = "_source" if "_source" in h else "fields"
                for column in h[fields_parameter_name]:
                    if result_fields and column not in result_fields_index:
                        continue

                    unested_results = get_flatten_results({column: h[fields_parameter_name][column]})

                    for column_name, value in unested_results.items():
                        add_column_if_needed(column_name, value=value)
                        row[column_name] = value

                result_rows.append(row)
        else:
            raise Exception("Redash failed to parse the results it got from Elasticsearch.")

class Kibana(BaseElasticSearch):
    @classmethod
    def enabled(cls):
        return True

    def _execute_simple_query(self, url, auth, _from, mappings, result_fields, result_columns, result_rows):
        url += "&from={0}".format(_from)
        r, error = self.get_response(url, http_method='GET')
        if error:
            r.raise_for_status()

        raw_result = r.json()
        self._parse_results(mappings, result_fields, raw_result, result_columns, result_rows)

        total = raw_result["hits"]["total"]
        result_size = len(raw_result["hits"]["hits"])
        logger.debug("Result Size: {0}  Total: {1}".format(result_size, total))

        return raw_result["hits"]["total"]

    def run_query(self, query, user):
        error = None
        logger.debug(query)
        query_params = json_loads(query)

        index_name = query_params.get("index", None)
        query_data = query_params.get("query", None)
        size = int(query_params.get("size", 500))
        limit = int(query_params.get("limit", 500))
        result_fields = query_params.get("_source", None)
        sort = query_params.get("sort", None)

        url = "/{0}/_search?".format(index_name) if index_name else "/_search?"
        mapping_url = "/{0}/_mapping".format(index_name) if index_name else "/_mapping"

        mappings, error = self._get_query_mappings(mapping_url)
        if error:
            return None, error

        if sort:
            url += "sort={0}".format(urllib.parse.quote_plus(sort))
        if query_data:
            url += "&q={0}".format(urllib.parse.quote_plus(query_data))

        logger.debug("Using URL: {0}".format(url))
        logger.debug("Using Query: {0}".format(query_data))

        result_columns = []
        result_rows = []
        if isinstance(query_data, str):
            _from = 0
            while True:
                query_size = size if limit >= (_from + size) else (limit - _from)
                total = self._execute_simple_query(
                    url + "&size={0}".format(query_size),
                    self.auth,
                    _from,
                    mappings,
                    result_fields,
                    result_columns,
                    result_rows,
                )
                _from += size
                if _from >= limit:
                    break
        else:
            # TODO: Handle complete ElasticSearch queries (JSON based sent over HTTP POST)
            raise Exception("Advanced queries are not supported")

        json_data = json_dumps({"columns": result_columns, "rows": result_rows})
        return json_data, error


class ElasticSearch(BaseElasticSearch):
    @classmethod
    def enabled(cls):
        return True

    @classmethod
    def name(cls):
        return "Elasticsearch"

    def run_query(self, query, user):
        error = None
        logger.debug(query)
        query_dict = json_loads(query)

        index_name = query_dict.pop("index", "")
        result_fields = query_dict.pop("_source", None)

        mapping_url = "/{0}/_mapping".format(index_name) if index_name else "/_mapping"
        mappings, error = self._get_query_mappings(mapping_url)
        if error:
            return None, error

        url = "/{0}/_search".format(index_name) if index_name else "/_search"
        logger.debug("Using URL: %s", url)
        logger.debug("Using query: %s", query_dict)
        response, error = self.get_response(url, http_method='GET', json=query_dict)
        if error:
            return None, error
        logger.debug("Result: %s", response.json())

        result_columns = []
        result_rows = []
        self._parse_results(mappings, result_fields, response.json(), result_columns, result_rows)
        json_data = json_dumps({"columns": result_columns, "rows": result_rows})
        return json_data, error

register(Kibana)
register(ElasticSearch)