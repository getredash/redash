import re

import sqlparse
import pystache
from redash.utils import mustache_render
from funcy import import distinct


def _replace_params(template):
    return re.sub('-?{{.+?}}', 'param', template)


def _inside_a_where_clause(a):
    if a is None:
        return False
    else:
        return type(a.parent) is sqlparse.sql.Where or _inside_a_where_clause(a.parent)


def _populating_an_in_operator(a, b):
    if type(a) is sqlparse.sql.Identifier and \
       type(b) is sqlparse.sql.IdentifierList and \
       _inside_a_where_clause(a):
        return True


def _equivalent_leaves(a, b):
    return type(a) == type(b) or \
        (type(a) is sqlparse.sql.Identifier and type(b) is sqlparse.sql.Token)


def _filter_noise(tokens):
    skippable_tokens = [sqlparse.tokens.Error, sqlparse.tokens.Whitespace]
    return [t for t in tokens if t.ttype not in skippable_tokens]


def _same_type(a, b):
    if _populating_an_in_operator(a, b):
        return True
    elif type(a) in (list, tuple):
        children_are_same = [_same_type(child_a, child_b) for (child_a, child_b) in zip(a, b)]
        return len(a) == len(b) and all(children_are_same)
    elif (hasattr(a, 'tokens') and hasattr(b, 'tokens')):
        return _same_type(_filter_noise(a.tokens), _filter_noise(b.tokens))
    else:
        return _equivalent_leaves(a, b)


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

    def apply(self, parameters):
        self.parameters = parameters
        self.query = mustache_render(self.template, self.parameters)
        return self

    @property
    def missing_params(self):
        query_parameters = set(_collect_query_parameters(self.template))
        return set(query_parameters) - set(_parameter_names(self.parameters))

    @property
    def text(self):
        return self.query


class ParameterizedSqlQuery(ParameterizedQuery):
    def __init__(self, template):
        ParameterizedQuery.__init__(self, template)

    def is_safe(self):
        template_tree = sqlparse.parse(_replace_params(self.template))
        query_tree = sqlparse.parse(self.query)

        return _same_type(template_tree, query_tree)

    @property
    def text(self):
        if not self.is_safe():
            raise SQLInjectionError()
        else:
            return super(ParameterizedSqlQuery, self).text


class SQLInjectionError(Exception):
    pass
