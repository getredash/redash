import pystache
from flask_login import current_user
from numbers import Number
from redash import models
from redash.utils import mustache_render, json_loads
from redash.permissions import require_access, view_only
from funcy import distinct
from dateutil.parser import parse


def dropdown_values(query_id, org):
    def _pluck_name_and_value(row):
        name_column = "name" if "name" in row.keys() else row.keys()[0]
        value_column = "value" if "value" in row.keys() else row.keys()[0]

        return {"name": row[name_column], "value": row[value_column]}

    query = models.Query.get_by_id_and_org(query_id, org)
    require_access(query.data_source.groups, current_user, view_only)
    query_result = models.QueryResult.get_by_id_and_org(query.latest_query_data_id, org)

    rows = json_loads(query_result.data)["rows"]

    return map(_pluck_name_and_value, rows)


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
    def __init__(self, template, schema=None, org=None):
        self.schema = schema or []
        self.template = template
        self.query = template
        self.parameters = {}
        self.org = org

    def apply(self, parameters):
        invalid_parameter_names = [key for (key, value) in parameters.iteritems() if not self._valid(key, value)]
        if invalid_parameter_names:
            raise InvalidParameterError(invalid_parameter_names)
        else:
            self.parameters.update(parameters)
            self.query = mustache_render(self.template, self.parameters)

        return self

    def _valid(self, name, value):
        definition = next((definition for definition in self.schema if definition["name"] == name), None)

        if not definition:
            return True

        validators = {
            "text": lambda value: isinstance(value, basestring),
            "number": lambda value: isinstance(value, Number),
            "enum": lambda value: value in definition["enumOptions"],
            "query": lambda value: value in [v["value"] for v in dropdown_values(definition["queryId"], self.org)],
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
    def missing_params(self):
        query_parameters = set(_collect_query_parameters(self.template))
        return set(query_parameters) - set(_parameter_names(self.parameters))

    @property
    def text(self):
        return self.query


class InvalidParameterError(Exception):
    def __init__(self, parameters):
        message = u"The following parameter values are incompatible with their type definitions: {}".format(", ".join(parameters))
        super(InvalidParameterError, self).__init__(message)
