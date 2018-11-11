import sqlite3
from unittest import TestCase

import pytest

from redash.query_runner import TYPE_BOOLEAN, TYPE_DATETIME, TYPE_FLOAT, TYPE_INTEGER, TYPE_STRING
from redash.query_runner.query_results import (CreateTableError, PermissionError, _guess_type, _load_query, create_table, extract_cached_query_ids, extract_query_ids, fix_column_name)
from tests import BaseTestCase


class TestExtractQueryIds(TestCase):
    def test_works_with_simple_query(self):
        query = "SELECT 1"
        self.assertEquals([], extract_query_ids(query))

    def test_finds_queries_to_load(self):
        query = "SELECT * FROM query_123"
        self.assertEquals([123], extract_query_ids(query))

    def test_finds_queries_in_joins(self):
        query = "SELECT * FROM query_123 JOIN query_4566"
        self.assertEquals([123, 4566], extract_query_ids(query))

    def test_finds_queries_with_whitespace_characters(self):
        query = "SELECT * FROM    query_123 a JOIN\tquery_4566 b ON a.id=b.parent_id JOIN\r\nquery_78 c ON b.id=c.parent_id"
        self.assertEquals([123, 4566, 78], extract_query_ids(query))


class TestCreateTable(TestCase):
    def test_creates_table_with_colons_in_column_name(self):
        connection = sqlite3.connect(':memory:')
        results = {'columns': [{'name': 'ga:newUsers'}, {
            'name': 'test2'}], 'rows': [{'ga:newUsers': 123, 'test2': 2}]}
        table_name = 'query_123'
        create_table(connection, table_name, results)
        connection.execute('SELECT 1 FROM query_123')

    def test_creates_table(self):
        connection = sqlite3.connect(':memory:')
        results = {'columns': [{'name': 'test1'},
                               {'name': 'test2'}], 'rows': []}
        table_name = 'query_123'
        create_table(connection, table_name, results)
        connection.execute('SELECT 1 FROM query_123')

    def test_creates_table_with_missing_columns(self):
        connection = sqlite3.connect(':memory:')
        results = {'columns': [{'name': 'test1'}, {'name': 'test2'}], 'rows': [
            {'test1': 1, 'test2': 2}, {'test1': 3}]}
        table_name = 'query_123'
        create_table(connection, table_name, results)
        connection.execute('SELECT 1 FROM query_123')

    def test_creates_table_with_spaces_in_column_name(self):
        connection = sqlite3.connect(':memory:')
        results = {'columns': [{'name': 'two words'}, {'name': 'test2'}], 'rows': [
            {'two words': 1, 'test2': 2}, {'test1': 3}]}
        table_name = 'query_123'
        create_table(connection, table_name, results)
        connection.execute('SELECT 1 FROM query_123')

    def test_creates_table_with_dashes_in_column_name(self):
        connection = sqlite3.connect(':memory:')
        results = {
            'columns': [{'name': 'two-words'}, {'name': 'test2'}],
            'rows': [{'two-words': 1, 'test2': 2}]
        }
        table_name = 'query_123'
        create_table(connection, table_name, results)
        connection.execute('SELECT 1 FROM query_123')
        connection.execute('SELECT "two-words" FROM query_123')

    def test_creates_table_with_non_ascii_in_column_name(self):
        connection = sqlite3.connect(':memory:')
        results = {'columns': [{'name': u'\xe4'}, {'name': 'test2'}], 'rows': [
            {u'\xe4': 1, 'test2': 2}]}
        table_name = 'query_123'
        create_table(connection, table_name, results)
        connection.execute('SELECT 1 FROM query_123')

    def test_shows_meaningful_error_on_failure_to_create_table(self):
        connection = sqlite3.connect(':memory:')
        results = {'columns': [], 'rows': []}
        table_name = 'query_123'
        with pytest.raises(CreateTableError):
            create_table(connection, table_name, results)

    def test_loads_results(self):
        connection = sqlite3.connect(':memory:')
        rows = [{'test1': 1, 'test2': 'test'}, {'test1': 2, 'test2': 'test2'}]
        results = {'columns': [{'name': 'test1'},
                               {'name': 'test2'}], 'rows': rows}
        table_name = 'query_123'
        create_table(connection, table_name, results)
        self.assertEquals(
            len(list(connection.execute('SELECT * FROM query_123'))), 2)


class TestGetQuery(BaseTestCase):
    # test query from different account
    def test_raises_exception_for_query_from_different_account(self):
        query = self.factory.create_query()
        user = self.factory.create_user(org=self.factory.create_org())

        self.assertRaises(PermissionError, lambda: _load_query(user, query.id))

    def test_raises_exception_for_query_with_different_groups(self):
        ds = self.factory.create_data_source(group=self.factory.create_group())
        query = self.factory.create_query(data_source=ds)
        user = self.factory.create_user()

        self.assertRaises(PermissionError, lambda: _load_query(user, query.id))

    def test_returns_query(self):
        query = self.factory.create_query()
        user = self.factory.create_user()

        loaded = _load_query(user, query.id)
        self.assertEquals(query, loaded)


class TestGuessType(TestCase):
    def test_string(self):
        self.assertEqual(TYPE_STRING, _guess_type(''))
        self.assertEqual(TYPE_STRING, _guess_type(None))
        self.assertEqual(TYPE_STRING, _guess_type('redash'))

    def test_integer(self):
        self.assertEqual(TYPE_INTEGER, _guess_type(42))

    def test_float(self):
        self.assertEqual(TYPE_FLOAT, _guess_type(3.14))

    def test_boolean(self):
        self.assertEqual(TYPE_BOOLEAN, _guess_type('true'))
        self.assertEqual(TYPE_BOOLEAN, _guess_type('false'))

    def test_date(self):
        self.assertEqual(TYPE_DATETIME, _guess_type('2018-06-28'))


class TestExtractCachedQueryIds(TestCase):
    def test_works_with_simple_query(self):
        query = "SELECT 1"
        self.assertEquals([], extract_cached_query_ids(query))

    def test_finds_queries_to_load(self):
        query = "SELECT * FROM cached_query_123"
        self.assertEquals([123], extract_cached_query_ids(query))

    def test_finds_queries_in_joins(self):
        query = "SELECT * FROM cached_query_123 JOIN cached_query_4566"
        self.assertEquals([123, 4566], extract_cached_query_ids(query))

    def test_finds_queries_with_whitespace_characters(self):
        query = "SELECT * FROM    cached_query_123 a JOIN\tcached_query_4566 b ON a.id=b.parent_id JOIN\r\ncached_query_78 c ON b.id=c.parent_id"
        self.assertEquals([123, 4566, 78], extract_cached_query_ids(query))


class TestFixColumnName(TestCase):
    def test_fix_column_name(self):
        self.assertEquals(u'"a_b_c_d"', fix_column_name("a:b.c d"))
