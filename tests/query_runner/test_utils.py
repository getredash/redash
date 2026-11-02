from unittest import TestCase
from unittest.mock import patch

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    guess_type,
    import_query_runners,
)


class TestGuessType(TestCase):
    def test_handles_unicode(self):
        self.assertEqual(guess_type("Текст"), TYPE_STRING)

    def test_detects_booleans(self):
        self.assertEqual(guess_type("true"), TYPE_BOOLEAN)
        self.assertEqual(guess_type("True"), TYPE_BOOLEAN)
        self.assertEqual(guess_type("TRUE"), TYPE_BOOLEAN)
        self.assertEqual(guess_type("false"), TYPE_BOOLEAN)
        self.assertEqual(guess_type("False"), TYPE_BOOLEAN)
        self.assertEqual(guess_type("FALSE"), TYPE_BOOLEAN)
        self.assertEqual(guess_type(False), TYPE_BOOLEAN)

    def test_detects_strings(self):
        self.assertEqual(guess_type(None), TYPE_STRING)
        self.assertEqual(guess_type(""), TYPE_STRING)
        self.assertEqual(guess_type("redash"), TYPE_STRING)

    def test_detects_integer(self):
        self.assertEqual(guess_type("42"), TYPE_INTEGER)
        self.assertEqual(guess_type(42), TYPE_INTEGER)

    def test_detects_float(self):
        self.assertEqual(guess_type("3.14"), TYPE_FLOAT)
        self.assertEqual(guess_type(3.14), TYPE_FLOAT)

    def test_detects_date(self):
        self.assertEqual(guess_type("2018-10-31"), TYPE_DATETIME)


class TestImportQueryRunners(TestCase):
    def test_skips_missing_runner_module(self):
        with self.assertLogs("redash.query_runner", level="WARNING"):
            import_query_runners(["redash.query_runner.does_not_exist"])

    def test_raises_on_missing_runner_dependency(self):
        with patch("builtins.__import__", side_effect=ModuleNotFoundError(name="some_driver")):
            with self.assertRaises(ModuleNotFoundError):
                import_query_runners(["redash.query_runner.pg"])
