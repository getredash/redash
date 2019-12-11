import logging
import sys
import urllib.request
import urllib.parse
import urllib.error

import requests
from requests.auth import HTTPBasicAuth
from six import string_types, text_type

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
    text_type: TYPE_STRING,
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

    def _get_mappings(self, url):
        mappings = {}
        error = None
        try:
            r = requests.get(url, auth=self.auth)
            r.raise_for_status()

            mappings = r.json()
        except requests.HTTPError as e:
            logger.exception(e)
            error = "Failed to execute query. Return Code: {0}   Reason: {1}".format(
                r.status_code, r.text
            )
            mappings = None
        except requests.exceptions.RequestException as e:
            logger.exception(e)
            error = "Connection refused"
            mappings = None

        return mappings, error

    def _get_query_mappings(self, url):
        mappings_data, error = self._get_mappings(url)
        if error:
            return mappings_data, error

        mappings = {}
        for index_name in mappings_data:
            index_mappings = mappings_data[index_name]
            for m in index_mappings.get("mappings", {}):
                if "properties" not in index_mappings["mappings"][m]:
                    continue
                for property_name in index_mappings["mappings"][m]["properties"]:
                    property_data = index_mappings["mappings"][m]["properties"][
                        property_name
                    ]
                    if property_name not in mappings:
                        property_type = property_data.get("type", None)
                        if property_type:
                            if property_type in ELASTICSEARCH_TYPES_MAPPING:
                                mappings[property_name] = ELASTICSEARCH_TYPES_MAPPING[
                                    property_type
                                ]
                            else:
                                mappings[property_name] = TYPE_STRING
                                # raise Exception("Unknown property type: {0}".format(property_type))

        return mappings, error

    def get_schema(self, *args, **kwargs):
        def parse_doc(doc, path=None):
            """Recursively parse a doc type dictionary
            """
            path = path or []
            result = []
            for field, description in doc["properties"].items():
                if "properties" in description:
                    result.extend(parse_doc(description, path + [field]))
                else:
                    result.append(".".join(path + [field]))
            return result

        schema = {}
        url = "{0}/_mappings".format(self.server_url)
        mappings, error = self._get_mappings(url)

        if mappings:
            # make a schema for each index
            # the index contains a mappings dict with documents
            # in a hierarchical format
            for name, index in mappings.items():
                columns = []
                schema[name] = {"name": name}
                for doc, items in index["mappings"].items():
                    columns.extend(parse_doc(items))

                # remove duplicates
                # sort alphabetically
                schema[name]["columns"] = sorted(set(columns))
        return list(schema.values())

    def _parse_results(
        self, mappings, result_fields, raw_result, result_columns, result_rows
    ):
        def add_column_if_needed(
            mappings, column_name, friendly_name, result_columns, result_columns_index
        ):
            if friendly_name not in result_columns_index:
                result_columns.append(
                    {
                        "name": friendly_name,
                        "friendly_name": friendly_name,
                        "type": mappings.get(column_name, "string"),
                    }
                )
                result_columns_index[friendly_name] = result_columns[-1]

        def get_row(rows, row):
            if row is None:
                row = {}
                rows.append(row)
            return row

        def collect_value(mappings, row, key, value, type):
            if result_fields and key not in result_fields_index:
                return

            mappings[key] = type
            add_column_if_needed(
                mappings, key, key, result_columns, result_columns_index
            )
            row[key] = value

        def collect_aggregations(
            mappings, rows, parent_key, data, row, result_columns, result_columns_index
        ):
            if isinstance(data, dict):
                for key, value in data.items():
                    val = collect_aggregations(
                        mappings,
                        rows,
                        parent_key if key == "buckets" else key,
                        value,
                        row,
                        result_columns,
                        result_columns_index,
                    )
                    if val:
                        row = get_row(rows, row)
                        collect_value(mappings, row, key, val, "long")

                for data_key in ["value", "doc_count"]:
                    if data_key not in data:
                        continue
                    if "key" in data and len(list(data.keys())) == 2:
                        key_is_string = "key_as_string" in data
                        collect_value(
                            mappings,
                            row,
                            data["key"] if not key_is_string else data["key_as_string"],
                            data[data_key],
                            "long" if not key_is_string else "string",
                        )
                    else:
                        return data[data_key]

            elif isinstance(data, list):
                for value in data:
                    result_row = get_row(rows, row)
                    collect_aggregations(
                        mappings,
                        rows,
                        parent_key,
                        value,
                        result_row,
                        result_columns,
                        result_columns_index,
                    )
                    if "doc_count" in value:
                        collect_value(
                            mappings,
                            result_row,
                            "doc_count",
                            value["doc_count"],
                            "integer",
                        )
                    if "key" in value:
                        if "key_as_string" in value:
                            collect_value(
                                mappings,
                                result_row,
                                parent_key,
                                value["key_as_string"],
                                "string",
                            )
                        else:
                            collect_value(
                                mappings, result_row, parent_key, value["key"], "string"
                            )

            return None

        result_columns_index = {c["name"]: c for c in result_columns}

        result_fields_index = {}
        if result_fields:
            for r in result_fields:
                result_fields_index[r] = None

        if "error" in raw_result:
            error = raw_result["error"]
            if len(error) > 10240:
                error = error[:10240] + "... continues"

            raise Exception(error)
        elif "aggregations" in raw_result:
            if result_fields:
                for field in result_fields:
                    add_column_if_needed(
                        mappings, field, field, result_columns, result_columns_index
                    )

            for key, data in raw_result["aggregations"].items():
                collect_aggregations(
                    mappings,
                    result_rows,
                    key,
                    data,
                    None,
                    result_columns,
                    result_columns_index,
                )

            logger.debug("result_rows %s", str(result_rows))
            logger.debug("result_columns %s", str(result_columns))
        elif "hits" in raw_result and "hits" in raw_result["hits"]:
            if result_fields:
                for field in result_fields:
                    add_column_if_needed(
                        mappings, field, field, result_columns, result_columns_index
                    )

            for h in raw_result["hits"]["hits"]:
                row = {}

                column_name = "_source" if "_source" in h else "fields"
                for column in h[column_name]:
                    if result_fields and column not in result_fields_index:
                        continue

                    add_column_if_needed(
                        mappings, column, column, result_columns, result_columns_index
                    )

                    value = h[column_name][column]
                    row[column] = (
                        value[0]
                        if isinstance(value, list) and len(value) == 1
                        else value
                    )

                result_rows.append(row)
        else:
            raise Exception(
                "Redash failed to parse the results it got from Elasticsearch."
            )

    def test_connection(self):
        try:
            r = requests.get(
                "{0}/_cluster/health".format(self.server_url), auth=self.auth
            )
            r.raise_for_status()
        except requests.HTTPError as e:
            logger.exception(e)
            raise Exception(
                "Failed to execute query. Return Code: {0}   Reason: {1}".format(
                    r.status_code, r.text
                )
            )
        except requests.exceptions.RequestException as e:
            logger.exception(e)
            raise Exception("Connection refused")


class Kibana(BaseElasticSearch):
    @classmethod
    def enabled(cls):
        return True

    def _execute_simple_query(
        self, url, auth, _from, mappings, result_fields, result_columns, result_rows
    ):
        url += "&from={0}".format(_from)
        r = requests.get(url, auth=self.auth)
        r.raise_for_status()

        raw_result = r.json()

        self._parse_results(
            mappings, result_fields, raw_result, result_columns, result_rows
        )

        total = raw_result["hits"]["total"]
        result_size = len(raw_result["hits"]["hits"])
        logger.debug("Result Size: {0}  Total: {1}".format(result_size, total))

        return raw_result["hits"]["total"]

    def run_query(self, query, user):
        try:
            error = None

            logger.debug(query)
            query_params = json_loads(query)

            index_name = query_params["index"]
            query_data = query_params["query"]
            size = int(query_params.get("size", 500))
            limit = int(query_params.get("limit", 500))
            result_fields = query_params.get("fields", None)
            sort = query_params.get("sort", None)

            if not self.server_url:
                error = "Missing configuration key 'server'"
                return None, error

            url = "{0}/{1}/_search?".format(self.server_url, index_name)
            mapping_url = "{0}/{1}/_mapping".format(self.server_url, index_name)

            mappings, error = self._get_query_mappings(mapping_url)
            if error:
                return None, error

            if sort:
                url += "&sort={0}".format(urllib.parse.quote_plus(sort))

            url += "&q={0}".format(urllib.parse.quote_plus(query_data))

            logger.debug("Using URL: {0}".format(url))
            logger.debug("Using Query: {0}".format(query_data))

            result_columns = []
            result_rows = []
            if isinstance(query_data, string_types):
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
        except KeyboardInterrupt:
            error = "Query cancelled by user."
            json_data = None
        except requests.HTTPError as e:
            logger.exception(e)
            error = "Failed to execute query. Return Code: {0}   Reason: {1}".format(
                r.status_code, r.text
            )
            json_data = None
        except requests.exceptions.RequestException as e:
            logger.exception(e)
            error = "Connection refused"
            json_data = None

        return json_data, error


class ElasticSearch(BaseElasticSearch):
    @classmethod
    def enabled(cls):
        return True

    @classmethod
    def name(cls):
        return "Elasticsearch"

    def run_query(self, query, user):
        try:
            error = None

            logger.debug(query)
            query_dict = json_loads(query)

            index_name = query_dict.pop("index", "")
            result_fields = query_dict.pop("result_fields", None)

            if not self.server_url:
                error = "Missing configuration key 'server'"
                return None, error

            url = "{0}/{1}/_search".format(self.server_url, index_name)
            mapping_url = "{0}/{1}/_mapping".format(self.server_url, index_name)

            mappings, error = self._get_query_mappings(mapping_url)
            if error:
                return None, error

            logger.debug("Using URL: %s", url)
            logger.debug("Using query: %s", query_dict)
            r = requests.get(url, json=query_dict, auth=self.auth)
            r.raise_for_status()
            logger.debug("Result: %s", r.json())

            result_columns = []
            result_rows = []
            self._parse_results(
                mappings, result_fields, r.json(), result_columns, result_rows
            )

            json_data = json_dumps({"columns": result_columns, "rows": result_rows})
        except KeyboardInterrupt:
            logger.exception(e)
            error = "Query cancelled by user."
            json_data = None
        except requests.HTTPError as e:
            logger.exception(e)
            error = "Failed to execute query. Return Code: {0}   Reason: {1}".format(
                r.status_code, r.text
            )
            json_data = None
        except requests.exceptions.RequestException as e:
            logger.exception(e)
            error = "Connection refused"
            json_data = None

        return json_data, error


register(Kibana)
register(ElasticSearch)
