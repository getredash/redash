import pystache
from redash.utils import mustache_render
from funcy import distinct


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


class ParameterizedQuery(object):
    def __init__(self, template):
        self.template = template
        self.query = template
        self.parameters = {}

    def apply(self, parameters):
        self.parameters.update(parameters)
        self.query = mustache_render(self.template, self.parameters)
        return self

    @property
    def missing_params(self):
        query_parameters = set(_collect_query_parameters(self.template))
        return set(query_parameters) - set(_parameter_names(self.parameters))

    @property
    def text(self):
        return self.query
