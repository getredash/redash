from redash.query_runner.script import Script
from tests import BaseTestCase


class TestInit(BaseTestCase):
    def test_wildcard(self):
        runner = Script({'path': '*'})
        self.assertIsInstance(runner, Script)

    def test_outside(self):
        self.assertRaises(ValueError, lambda: Script({'path': '../../'}))
