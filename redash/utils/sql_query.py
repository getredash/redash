import re

import sqlparse
from redash.utils import mustache_render


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


class SQLQuery(object):
    def __init__(self, template):
        self.template = template
        self.query = template

    def apply(self, parameters):
        self.query = mustache_render(self.template, parameters)
        return self

    def is_safe(self):
        template_tree = sqlparse.parse(_replace_params(self.template))
        query_tree = sqlparse.parse(self.query)

        return _same_type(template_tree, query_tree)

    @property
    def text(self):
        if not self.is_safe():
            raise SQLInjectionError()
        else:
            return self.query


class SQLInjectionError(Exception):
    pass
