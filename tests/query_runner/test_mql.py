from datetime import datetime
from unittest import TestCase
from redash.query_runner import TYPE_DATETIME, TYPE_INTEGER, TYPE_STRING
from redash.query_runner.mql import deduce_columns


class TestMQL(TestCase):
    def test_deduce_columns(self):
        self.assertEquals(deduce_columns([{'a': 1}]),
                          [{'name': 'a', 'friendly_name': 'a', 'type': TYPE_INTEGER}])
        self.assertEquals(deduce_columns([{'a': 'foo'}]),
                          [{'name': 'a', 'friendly_name': 'a', 'type': TYPE_STRING}])
        self.assertEquals(deduce_columns([{'a': datetime.now()}]),
                          [{'name': 'a', 'friendly_name': 'a', 'type': TYPE_DATETIME}])
