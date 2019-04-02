import pystache
from functools import partial
from flask_login import current_user
from flask_restful import abort
from numbers import Number
from redash.utils import mustache_render, json_loads
from redash.permissions import require_access, view_only
from funcy import distinct
from dateutil.parser import parse


def _pluck_name_and_value(default_column, row):
    row = {k.lower(): v for k, v in row.items()}
    name_column = "name" if "name" in row.keys() else default_column.lower()
    value_column = "value" if "value" in row.keys() else default_column.lower()

    return {"name": row[name_column], "value": unicode(row[value_column])}


def _load_result(query_id, should_require_access):
    from redash.authentication.org_resolving import current_org
    from redash import models

    query = models.Query.get_by_id_and_org(query_id, current_org)

    if should_require_access:
        require_access(query.data_source, current_user, view_only)

    query_result = models.QueryResult.get_by_id_and_org(query.latest_query_data_id, current_org)

    if query.data_source:
        require_access(query.data_source.groups, current_user, view_only)
        query_result = models.QueryResult.get_by_id_and_org(query.latest_query_data_id, current_org)
        return json_loads(query_result.data)
    else:
        abort(400, message="This query is detached from any data source. Please select a different query.")


def dropdown_values(query_id, should_require_access=True):
    data = _load_result(query_id, should_require_access)
    first_column = data["columns"][0]["name"]
    pluck = partial(_pluck_name_and_value, first_column)
    return map(pluck, data["rows"])


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
    for key, value in parameter_values.iteritems():
        if isinstance(value, dict):
            for inner_key in value.keys():
                names.append(u'{}.{}'.format(key, inner_key))
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
    except ValueError:
        return False


def _is_date_range(obj):
    try:
        return _is_date(obj["start"]) and _is_date(obj["end"])
    except (KeyError, TypeError):
        return False


class ParameterizedQuery(object):
    def __init__(self, template, schema=None):
        self.schema = schema or []
        self.template = template
        self.query = template
        self.parameters = {}

    def apply(self, parameters):
        invalid_parameter_names = [key for (key, value) in parameters.iteritems() if not self._valid(key, value)]
        if invalid_parameter_names:
            raise InvalidParameterError(invalid_parameter_names)
        else:
            self.parameters.update(parameters)
            self.query = mustache_render(self.template, self.parameters)

        return self

    def _valid(self, name, value):
        if not self.schema:
            return True

        definition = next((definition for definition in self.schema if definition["name"] == name), None)

        if not definition:
            return False

        validators = {
            "text": lambda value: isinstance(value, basestring),
            "number": _is_number,
            "enum": lambda value: value in definition["enumOptions"],
            "query": lambda value: unicode(value) in [v["value"] for v in dropdown_values(definition["queryId"])],
            "date": _is_date,
            "datetime-local": _is_date,
            "datetime-with-seconds": _is_date,
            "date-range": _is_date_range,
            "datetime-range": _is_date_range,
            "datetime-range-with-seconds": _is_date_range,
        }

        validate = validators.get(definition["type"], lambda x: False)

        return validate(value)

    @property
    def is_safe(self):
        text_parameters = filter(lambda p: p["type"] == "text", self.schema)
        return not any(text_parameters)

    @property
    def missing_params(self):
        query_parameters = set(_collect_query_parameters(self.template))
        return set(query_parameters) - set(_parameter_names(self.parameters))

    @property
    def text(self):
        return self.query


class InvalidParameterError(Exception):
    def __init__(self, parameters):
        parameter_names = u", ".join(parameters)
        message = u"The following parameter values are incompatible with their definitions: {}".format(parameter_names)
        super(InvalidParameterError, self).__init__(message)
