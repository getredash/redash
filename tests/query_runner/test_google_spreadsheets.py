# -*- coding: utf-8 -*-

from unittest import TestCase

from mock import Mock, MagicMock

from redash.query_runner.google_spreadsheets import _guess_type, _value_eval_list, TYPE_STRING, TYPE_BOOLEAN
from redash.query_runner.google_spreadsheets import parse_worksheet, parse_spreadsheet, WorksheetNotFoundError


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


class TestParseSpreadsheet(TestCase):
    def test_returns_meaningful_error_for_missing_worksheet(self):
        spreadsheet = MagicMock()

        spreadsheet.worksheets = MagicMock(return_value=[])
        self.assertRaises(WorksheetNotFoundError, parse_spreadsheet, spreadsheet, 0)

        spreadsheet.worksheets = MagicMock(return_value=[1, 2])
        self.assertRaises(WorksheetNotFoundError, parse_spreadsheet, spreadsheet, 2)


empty_worksheet = []
only_headers_worksheet = [['Column A', 'Column B']]
regular_worksheet = [['String Column', 'Boolean Column', 'Number Column'], ['A', 'TRUE', '1'], ['B', 'FALSE', '2'], ['C', 'TRUE', '3'], ['D', 'FALSE', '4']]


# The following test that the parse function doesn't crash. They don't test correct output.
class TestParseWorksheet(TestCase):
    def test_parse_empty_worksheet(self):
        parse_worksheet(empty_worksheet)

    def test_parse_only_headers_worksheet(self):
        parse_worksheet(only_headers_worksheet)

    def test_parse_regular_worksheet(self):
        parse_worksheet(regular_worksheet)

    def test_parse_worksheet_with_duplicate_column_names(self):
        worksheet = [['Column', 'Another Column', 'Column'], ['A', 'TRUE', '1'], ['B', 'FALSE', '2'], ['C', 'TRUE', '3'], ['D', 'FALSE', '4']]
        parsed = parse_worksheet(worksheet)

        columns = map(lambda c: c['name'], parsed['columns'])
        self.assertEqual('Column', columns[0])
        self.assertEqual('Another Column', columns[1])
        self.assertEqual('Column1', columns[2])

        self.assertEqual('A', parsed['rows'][0]['Column'])
        self.assertEqual(True, parsed['rows'][0]['Another Column'])
        self.assertEqual(1, parsed['rows'][0]['Column1'])

