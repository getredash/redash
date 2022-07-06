from unittest import TestCase

from redash.query_runner.python import Python


class TestPython(TestCase):
    def test_sorted_safe_builtins(self):
        src = list(Python.safe_builtins)
        assert src == sorted(src), 'Python safe_builtins package not sorted.'
