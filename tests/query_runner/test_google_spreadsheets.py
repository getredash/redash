# -*- coding: utf-8 -*-

from unittest import TestCase
from redash.query_runner.google_spreadsheets import _guess_type, _value_eval_list, TYPE_STRING, TYPE_BOOLEAN


class TestGuessType(TestCase):
    def test_handles_unicode(self):
        self.assertEqual(_guess_type(u'יוניקוד'), TYPE_STRING)

    def test_detects_booleans(self):
        self.assertEqual(_guess_type('true'), TYPE_BOOLEAN)
        self.assertEqual(_guess_type('True'), TYPE_BOOLEAN)
        self.assertEqual(_guess_type('TRUE'), TYPE_BOOLEAN)
        self.assertEqual(_guess_type('false'), TYPE_BOOLEAN)
        self.assertEqual(_guess_type('False'), TYPE_BOOLEAN)
        self.assertEqual(_guess_type('FALSE'), TYPE_BOOLEAN)


class TestValueEvalList(TestCase):
    def test_handles_unicode(self):
        values = [u'יוניקוד', 'test', 'value']
        self.assertEqual(values, _value_eval_list(values))

    def test_handles_boolean(self):
        values = ['true', 'false', 'True', 'False', 'TRUE', 'FALSE']
        converted_values = [True, False, True, False, True, False]
        self.assertEqual(converted_values, _value_eval_list(values))
