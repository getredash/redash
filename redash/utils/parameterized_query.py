import pystache
from redash.utils import mustache_render
from funcy import distinct
from dateutil.parser import parse

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
    def __init__(self, template, schema={}):
        self.template = template
        self.schema = schema
        self.query = template
        self.parameters = {}

    def apply(self, parameters):
        invalid_parameter_names = [key for (key, value) in parameters.iteritems() if not self._valid(key, value)]
        if invalid_parameter_names:
            message = u"The following parameter values are incompatible with their type definitions: {}".format(",".join(invalid_parameter_names))
            raise InvalidParameterError(message)
        else:
            self.parameters.update(parameters)
            self.query = mustache_render(self.template, self.parameters)

        return self

    def _valid(self, name, value):
        definition = next((definition for definition in self.schema if definition["name"] == name), None)

        if not definition:
            return True

        validators = {
            "text": lambda x: isinstance(x, basestring),
            "number": lambda x: isinstance(x, int),
            "enum": lambda x: x in definition["enumOptions"],
            "date": _is_date,
            "datetime-local": _is_date,
            "datetime-with-seconds": _is_date,
            "date-range": _is_date_range,
            "datetime-range": _is_date_range,
            "datetime-range-with-seconds": _is_date_range,
        }

        return validators[definition["type"]](value)

    @property
    def missing_params(self):
        query_parameters = set(_collect_query_parameters(self.template))
        return set(query_parameters) - set(_parameter_names(self.parameters))

    @property
    def text(self):
        return self.query


class InvalidParameterError(Exception):
    pass
