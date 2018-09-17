from unittest import TestCase

from redash.query_runner import TYPE_BOOLEAN, TYPE_DATETIME, TYPE_FLOAT, TYPE_INTEGER, TYPE_STRING, guess_type


class TestGuessType(TestCase):
    def test_string(self):
        self.assertEqual(TYPE_STRING, guess_type(''))
        self.assertEqual(TYPE_STRING, guess_type(None))
        self.assertEqual(TYPE_STRING, guess_type('redash'))

    def test_integer(self):
        self.assertEqual(TYPE_INTEGER, guess_type(42))

    def test_float(self):
        self.assertEqual(TYPE_FLOAT, guess_type(3.14))

    def test_boolean(self):
        self.assertEqual(TYPE_BOOLEAN, guess_type('true'))
        self.assertEqual(TYPE_BOOLEAN, guess_type('false'))

    def test_date(self):
        self.assertEqual(TYPE_DATETIME, guess_type('2018-06-28'))
