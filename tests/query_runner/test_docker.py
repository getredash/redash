# -*- coding: utf-8 -*-
from redash.query_runner import TYPE_BOOLEAN, TYPE_INTEGER, TYPE_FLOAT, \
                                TYPE_DATETIME, TYPE_STRING

from redash.query_runner.docker import parse_result, guess_type


def test_handles_unicode():
    values = (u'יוניקוד', 'barça', 'foo')
    assert guess_type(values) == TYPE_STRING

def test_detects_booleans():
    values = ('true', 'True', 'TRUE', 'False', 'false', 'FALSE')
    assert guess_type(values) == TYPE_BOOLEAN

def test_detects_strings():
    values = ('',)
    assert TYPE_STRING == guess_type(values)

    values = ('13', 'foo', 'bar',)
    assert TYPE_STRING == guess_type(values)

    values = ('true', 'foo')
    assert TYPE_STRING == guess_type(values)

    values = ('40,3', '40', 'foo')
    assert TYPE_STRING == guess_type(values)

    values = ('2018-200-1',)
    assert TYPE_STRING == guess_type(values)

def test_detects_integer():
    assert TYPE_INTEGER == guess_type(['42', '3', '-14'])

def test_detects_float():
    assert TYPE_FLOAT == guess_type(['13', '3.14'])

def test_detects_date():
    values = ('28/5/2018', '2018-05-28T11:30:54Z')
    assert TYPE_DATETIME == guess_type(values)


def test_json_only_header():
    stdout = '''
    {
        "columns": [{
            "name": "col1"
        }],
        "rows": []
    }
    '''
    result = parse_result(stdout)
    assert len(result['columns']) == 1
    assert len(result['rows']) == 0

def test_csv_only_header():
    stdout = "col1,col2"
    result = parse_result(stdout)
    assert len(result['columns']) == 2
    assert len(result['rows']) == 0

def test_tsv_only_header():
    stdout = "col1\tcol2"
    result = parse_result(stdout)
    assert len(result['columns']) == 2
    assert len(result['rows']) == 0

def test_json_inferred():
    stdout = '''
    {
        "columns": [{
            "name": "col_one"
        }],
        "rows": [{
            "col_one": 10
        }]
    }
    '''
    result = parse_result(stdout)
    assert len(result['columns']) == 1
    assert result['columns'][0]['friendly_name'] == 'Col One'
    assert result['columns'][0]['type'] == TYPE_INTEGER
    assert len(result['rows']) == 1
    assert result['rows'][0]['col_one'] == '10'

def test_csv_inferred_type():
    stdout = "col1,col2\n10,true,40,False"
    result = parse_result(stdout)
    assert result['columns'][0]['type'] == TYPE_INTEGER
    assert result['columns'][1]['type'] == TYPE_BOOLEAN

def test_csv_hinted_type():
    stdout = "col1:boolean,col2:float\nfoo,bar"
    result = parse_result(stdout)
    assert result['columns'][0]['type'] == TYPE_BOOLEAN
    assert result['columns'][1]['type'] == TYPE_FLOAT

def test_csv_different_columns():
    stdout = "col1,col2\n1,2,3\n1"

    result = parse_result(stdout)
    assert len(result['columns']) == 2
    assert len(result['rows']) == 2
    first, second = result['rows']
    assert len(first) == 2
    assert first['col1'] == '1'
    assert first['col2'] == '2'

    assert len(second) == 2
    assert second['col1'] == '1'
    assert second['col2'] == ''
