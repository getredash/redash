from functools import partial
from numbers import Number

import pystache
from dateutil.parser import parse
from funcy import compact, distinct, lpluck
from six import string_types, text_type

from redash.permissions import require_access, view_only
from redash.utils import json_loads, mustache_render


def _pluck_name_and_value(default_column, row):
    row = {k.lower(): v for k, v in row.items()}
    name_column = "name" if "name" in row.keys() else default_column.lower()
    value_column = "value" if "value" in row.keys() else default_column.lower()

    return {"name": row[name_column], "value": text_type(row[value_column])}


def _load_result(query_id, org):
    from redash import models

    query = models.Query.get_by_id_and_org(query_id, org)

    if query.data_source:
        query_result = models.QueryResult.get_by_id_and_org(
            query.latest_query_data_id, org
        )
        return query_result.data
    else:
        raise QueryDetachedFromDataSourceError(query_id)


def dropdown_values(query_id, org):
    data = _load_result(query_id, org)
    first_column = data["columns"][0]["name"]
    pluck = partial(_pluck_name_and_value, first_column)
    return list(map(pluck, data["rows"]))


def join_parameter_list_values(parameters, schema):
    updated_parameters = {}
    for key, value in parameters.items():
        if isinstance(value, list):
            definition = next(
                (definition for definition in schema if definition["name"] == key), {}
            )
            multi_values_options = definition.get("multiValuesOptions", {})
            separator = str(multi_values_options.get("separator", ","))
            prefix = str(multi_values_options.get("prefix", ""))
            suffix = str(multi_values_options.get("suffix", ""))
            updated_parameters[key] = separator.join(
                [prefix + v + suffix for v in value]
            )
        else:
            updated_parameters[key] = value
    return updated_parameters


def _collect_key_names(nodes):
    keys = []
    for node in nodes._parse_tree:
        if isinstance(node, pystache.parser._EscapeNode):
            keys.append(node.key)
        elif isinstance(node, pystache.parser._SectionNode):
            keys.append(node.key)
            keys.extend(_collect_key_names(node.parsed))

    return distinct(keys)


def _collect_query_parameters(query):
    nodes = pystache.parse(query)
    keys = _collect_key_names(nodes)
    return keys


def _parameter_names(parameter_values):
    names = []
    for key, value in parameter_values.items():
        if isinstance(value, dict):
            for inner_key in value.keys():
                names.append("{}.{}".format(key, inner_key))
        else:
            names.append(key)

    return names


def _is_number(string):
    if isinstance(string, Number):
        return True
    else:
        try:
            float(string)
            return True
        except ValueError:
            return False


def _is_date(string):
    try:
        parse(string)
        return True
    except (ValueError, TypeError):
        return False


def _is_date_range(obj):
    try:
        return _is_date(obj["start"]) and _is_date(obj["end"])
    except (KeyError, TypeError):
        return False


def _is_date_range_type(type):
    return type in ["date-range", "datetime-range", "datetime-range-with-seconds"]


def _is_tag_in_template(name, template):
    tags = _collect_query_parameters(template)
    return name in tags


def _is_value_within_options(value, dropdown_options, allow_list=False):
    if isinstance(value, list):
        return allow_list and set(map(text_type, value)).issubset(set(dropdown_options))
    return text_type(value) in dropdown_options


class ParameterizedQuery(object):
    def __init__(self, template, schema=None, org=None):
        self.schema = schema or []
        self.org = org
        self.template = template
        self.query = template
        self.parameters = {}

    def apply(self, parameters):
        # filter out params not defined in schema
        if self.schema:
            names_with_definition = lpluck("name", self.schema)
            parameters = {
                k: v for (k, v) in parameters.items() if k in names_with_definition
            }

        invalid_parameters = compact(
            {k: self._invalid_message(k, v) for (k, v) in parameters.items()}
        )
        if invalid_parameters:
            raise InvalidParameterError(invalid_parameters)
        else:
            self.parameters.update(parameters)
            self.query = mustache_render(
                self.template, join_parameter_list_values(parameters, self.schema)
            )

        return self

    def _invalid_message(self, name, value):
        if value is None:
            return "Required parameter"

        # skip if no schema
        if not self.schema:
            return None

        definition = next(
            (definition for definition in self.schema if definition["name"] == name),
            None,
        )

        if not definition:
            return "Parameter no longer exists in query."

        enum_options = definition.get("enumOptions")
        query_id = definition.get("queryId")
        allow_multiple_values = isinstance(definition.get("multiValuesOptions"), dict)

        if isinstance(enum_options, string_types):
            enum_options = enum_options.split("\n")

        value_validators = {
            "text": lambda value: isinstance(value, string_types),
            "number": _is_number,
            "enum": lambda value: _is_value_within_options(
                value, enum_options, allow_multiple_values
            ),
            "query": lambda value: _is_value_within_options(
                value,
                [v["value"] for v in dropdown_values(query_id, self.org)],
                allow_multiple_values,
            ),
            "date": _is_date,
            "datetime-local": _is_date,
            "datetime-with-seconds": _is_date,
            "date-range": _is_date_range,
            "datetime-range": _is_date_range,
            "datetime-range-with-seconds": _is_date_range,
        }

        validate_value = value_validators.get(definition["type"], lambda x: False)

        if not validate_value(value):
            return "Invalid value"

        tag_error_msg = self._validate_tag(name, definition["type"])
        if tag_error_msg is not None:
            return tag_error_msg

        return None

    def _validate_tag(self, name, type):
        error_msg = "{{{{ {0} }}}} not found in query"
        if _is_date_range_type(type):
            start_tag = "{}.start".format(name)
            if not _is_tag_in_template(start_tag, self.template):
                return error_msg.format(start_tag)

            end_tag = "{}.end".format(name)
            if not _is_tag_in_template(end_tag, self.template):
                return error_msg.format(end_tag)

        elif not _is_tag_in_template(name, self.template):
            return error_msg.format(name)

        return None

    @property
    def is_safe(self):
        text_parameters = [param for param in self.schema if param["type"] == "text"]
        return not any(text_parameters)

    @property
    def missing_params(self):
        query_parameters = _collect_query_parameters(self.template)
        return set(query_parameters) - set(_parameter_names(self.parameters))

    @property
    def missing_params_error(self):
        missing_params = self.missing_params
        if not missing_params:
            return None

        parameter_names = ", ".join(
            '"{}"'.format(name) for name in sorted(missing_params)
        )
        if len(missing_params) > 1:
            message = "Parameters {} are missing.".format(parameter_names)
        else:
            message = "Parameter {} is missing.".format(parameter_names)

        parameter_errors = {name: "Missing parameter" for name in missing_params}
        return message, parameter_errors

    @property
    def text(self):
        return self.query


class InvalidParameterError(Exception):
    def __init__(self, parameter_errors):
        parameter_names = ", ".join(
            '"{}"'.format(name) for name in sorted(parameter_errors.keys())
        )
        if len(parameter_errors) > 1:
            message = "Parameters {} are invalid.".format(parameter_names)
        else:
            message = "Parameter {} is invalid.".format(parameter_names)

        self.message = message
        self.parameter_errors = parameter_errors

        super().__init__(message, parameter_errors)


class QueryDetachedFromDataSourceError(Exception):
    def __init__(self, query_id):
        self.query_id = query_id
        self.message = "This query is detached from any data source. Please select a different query."

        super().__init__(self.message)
