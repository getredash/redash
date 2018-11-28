import sqlparse
from redash.utils import mustache_render


class SQLQuery(object):
    def __init__(self, template):
        self.template = template
        self.query = template

    def apply(self, parameters):
        self.query = mustache_render(self.template, parameters)
        return self

    def is_safe(self):
        template_tree = sqlparse.parse(self.template)
        query_tree = sqlparse.parse(self.query)
        return self._same_type(template_tree, query_tree)

    def _same_type(self, a, b):
        if type(a) != type(b):
            return False
        elif type(a) in (list, tuple):
            children_are_same = [self._same_type(child_a, child_b) for (child_a, child_b) in zip(a, b)]
            return len(a) == len(b) and all(children_are_same)
        elif hasattr(a, 'tokens'):
            template_tokens = filter(lambda t: t.ttype is not sqlparse.tokens.Error, a.tokens)
            query_tokens = b.tokens
            return self._same_type(template_tokens, query_tokens)
        else:
            return True

    def text(self):
        if not self.is_safe():
            raise SQLInjectionException()
        else:
            return self.query


class SQLInjectionException(Exception):
    pass
