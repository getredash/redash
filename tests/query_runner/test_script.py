from redash.query_runner.script import Script
from tests import BaseTestCase


class TestInit(BaseTestCase):
    def test_wildcard(self):
        runner = Script({'path': '*'})
        self.assertIsInstance(runner, Script)

    def test_outside(self):
        self.assertRaises(ValueError, lambda: Script({'path': '../../'}))


class TestStripWhitespacesAndAnnotation(BaseTestCase):
    def test_strip_whitespaces_and_annotation(self):
        runner = Script({'path': '*'})
        script = '/path/to/script hello'
        query = '/* Username: admin@example.com, Task ID: 5d474893-2145-4e9c-929c-89df3bdb4d3b, Query ID: 1, Queue: queries, Query Hash: 3e9b6b44b4c1651cb2237d3f4e9cf78f */   %s  ' % script
        self.assertEqual(runner.strip_whitespaces_and_annotation(query), script)
