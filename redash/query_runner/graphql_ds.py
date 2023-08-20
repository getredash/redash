# graphql_ds.py
import logging
import yaml
import datetime
from funcy import compact
import re
import copy
from redash.utils import json_dumps
from redash.query_runner import (
    BaseHTTPQueryRunner,
    register,
    TYPE_BOOLEAN,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
)

class QueryParseError(Exception):
    pass

def parse_query(query):
    # TODO: copy paste from Metrica query runner, we should extract this into a utility
    query = query.strip()
    if query == "":
        raise QueryParseError("Query is empty.")
    try:
        params = yaml.safe_load(query)
        return params
    except ValueError as e:
        logging.exception(e)
        error = str(e)
        raise QueryParseError(error)

def _get_type(value):
    if isinstance(value, str):
            return TYPE_STRING
    elif isinstance(value, int):
        #handle bigint case
        if value > 2**32:
            return TYPE_STRING
        else:     
            return TYPE_INTEGER
    elif isinstance(value, float):
        return TYPE_FLOAT
    elif isinstance(value, bool):
        return TYPE_BOOLEAN
    elif isinstance(value, datetime.datetime):
        return TYPE_DATETIME
    else:
        return TYPE_STRING

def _get_column_by_name(columns, column_name):
    for c in columns:
        if "name" in c and c["name"] == column_name:
            return c
    return None

def add_column(columns, column_name, column_type):
    if _get_column_by_name(columns, column_name) is None:
        columns.append(
            {"name": column_name, "friendly_name": column_name, "type": column_type}
        )

def _apply_path_search(response, path):
    if path is None:
        return response

    path_parts = path.split("_")
    path_parts.reverse()
    while len(path_parts) > 0:
        current_path = path_parts.pop()
        if current_path in response:
            response = response[current_path]
        else:
            raise Exception("Couldn't find path {} in response.".format(path))

    return response

def _normalize_json(data, path):
    data = _apply_path_search(data, path)

    if isinstance(data, dict):
        first_key = next(iter(data))
        if isinstance(data[first_key], list):
            new_data = []
            for key in data:
                for index, item in enumerate(data[key]):
                    if index >= len(new_data):
                        new_data.append({})
                    new_data[index][key] = item
            data = new_data
        else:
            data = [data]
    return data

def _sort_columns_with_fields(columns, fields):
    if fields:
        columns = compact([_get_column_by_name(columns, field) for field in fields])
    return columns

def flatten_dict(data, parent_key='', sep='_'):
    items = []
    for k, v in data.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        elif isinstance(v, list):
            for i in v:
                items.extend(flatten_dict(i, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

def parse_json(data, path, fields):
    data = _normalize_json(data, path)

    rows = []
    columns = []

    for row in data:
        expanded_rows = []
        parsed_row = flatten_dict(row)        

        for key, value in parsed_row.items():
    
            if isinstance(value, list):
                for i, item in enumerate(value):
                    if i < len(expanded_rows):
                        expanded_rows[i][key] = item
                    else:
                        new_row = copy.deepcopy(parsed_row)
                        new_row[key] = item
                        expanded_rows.append(new_row)
            elif fields and key not in fields:
                continue
            else:
                for r in expanded_rows:                    
                    r[key] = value

        if not expanded_rows:
            expanded_rows.append(parsed_row)

        for r in expanded_rows:
            for key, value in r.items():
                if 'timestamp' in str(key).lower() :
                    r[key] = int(value)
                    add_column(columns, key, TYPE_INTEGER)
                else:
                    add_column(columns, key, _get_type(value))

            rows.append(r)

    columns = _sort_columns_with_fields(columns, fields)

    return {"rows": rows, "columns": columns}



class GraphQL(BaseHTTPQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string", "title": "GraphQL endpoint URL"},
            },
            "required": ["url"],
            "secret": [],
        }

    @classmethod
    def type(cls):
        return "graphql"

    def __init__(self, configuration):
        super(GraphQL, self).__init__(configuration)
        self.syntax = "graphql"
 
    def _get_fields(self, type_):
        try:
            if type_["kind"] == "LIST" or type_["kind"] == "NON_NULL":
                # check if 'ofType' key exists in the dictionary
                if 'ofType' in type_:
                    return self._get_fields(type_["ofType"])
                else:
                    #logging.error(f"Missing 'ofType' in type: {type_} with kind: {type_['kind']}")
                    return None, ValueError(f"Missing 'ofType' in type: {type_} with kind: {type_['kind']}")  # return None, error
            elif type_["kind"] in ["OBJECT", "INTERFACE", "ENUM"]:
                fields_response, error = self.get_response(self.configuration["url"], http_method="post", json={"query": f"{{ __type(name: \"{type_['name']}\") {{ fields {{ name, type {{ name, kind, ofType {{ name, kind }} }} }} }} }}"})
                if error:
                    #logging.error(f"_get_fields exception: {error}")
                    return None, error
                else:
                    return fields_response, None
            else:
                return None, None
        except Exception as e:
            logging.error(f"_get_fields exception: {e}")
            return None, e


    
    def _get_type_name(self, type_):
        #logging.info(f"type_: {type_}")
        if type_ is None:
            return None
        elif isinstance(type_, dict):
            kind = type_.get("kind")
            if kind in ["LIST", "NON_NULL"]:
                # check if 'ofType' key exists in the dictionary
                if 'ofType' in type_:
                    # get type name of ofType
                    return self._get_type_name(type_["ofType"])
                else:
                    return kind
            elif kind in ["OBJECT", "INTERFACE", "ENUM","INPUT_OBJECT"]:
                return kind
            else:
                # return type name
                return type_.get("name")
        else:
            # return type name if it's not a dictionary
            return type_.get("name")


    def get_schema(self, get_stats=False):
        try:
            schema = {}
            query = """
            query IntrospectionQuery {
                __schema {
                    queryType { name, fields { name, type { name, kind, ofType { name, kind } } } }
                    mutationType { name, fields { name, type { name, kind, ofType { name, kind } } } }
                }
            }
            """
            response, error = self.get_response(self.configuration["url"], http_method="post", json={"query": query})

            if error is not None:
                logging.info("Failed to fetch schema information.")
                return []

            if response.status_code != 200:
                logging.info("Failed getting schema, status code: {}".format(response.status_code))
                return []

            schema_dict = response.json()

            for type_ in schema_dict['data']['__schema']['queryType']['fields']:
                table_name = type_['name']
                schema[table_name] = {"name": table_name, "columns": []}
                fields_response, fields_error = self._get_fields(type_["type"])
                if fields_error is not None:
                    #logging.error(f"Failed to get fields for type: {type_}")
                    continue  # skip this type

                if fields_response.status_code != 200:
                    #logging.error(f"Failed getting fields for type: {type_}")
                    continue  # skip this type

                fields_dict = fields_response.json()
                for field in fields_dict["data"]["__type"]["fields"]:
                    column_name = field["name"]
                    column_type = self._get_type_name(field["type"])
                    column_type = column_type if column_type is not None else "unknown"
                    schema[table_name]["columns"].append({"name": column_name, "type": column_type})

            #logging.info("formatted schema: %s", schema)

            return list(schema.values())
        except Exception as e:
            logging.error(f"get_tables exception: {e}")
            return []
        
    def run_query(self, query, user):
        if query == "":
            return None, "Query is empty."

        url = self.configuration.get("url")

        rows = []
        offset = 0
        limit = 1000
            
        while True:
            modified_query = query.replace("$first", str(limit)).replace("$skip", str(offset))

            request_options = {
                "headers": {"Content-Type": "application/json"},
                "json": {"query": modified_query},
            }

            response, error = self.get_response(url, http_method="post", **request_options)

            if error is not None:
                return None, error

            if response.status_code != 200:
                return None, "Failed to execute query. Return status code: {}.".format(response.status_code)

            response_data = response.json()
            if "errors" in response_data:
                return None, "Errors in query execution: {}".format(response_data["errors"])

            data = response_data.get("data", {})

            # Use parse_json function to format the data properly
            formatted_data = parse_json(data, None, None)

            if formatted_data:
                # Accumulate the rows
                rows += formatted_data['rows']
                # If fewer rows than the limit, we have fetched all the data
                if len(formatted_data['rows']) < limit:
                    break
                else:
                    # Increase the offset by the limit for the next iteration
                    offset += limit

            else:
                return None, "Got empty response from '{}'.".format(url)

        # Wrap the final result
        result = {"rows": rows, "columns": formatted_data['columns']}

        json_data = json_dumps(result)
        return json_data, None

register(GraphQL)