# -*- coding: utf-8 -*-
from redash.query_runner.elasticsearch import ElasticSearch
from unittest import TestCase


class TestElasticsearch(TestCase):

    def setUp(self):
        self.query_runner = ElasticSearch({"server": "http://localhost:9200"})

    def test_aggregations_1(self):
        """nested buckets, all buckets are list"""
        query_result = {
            'status': 200,
            'hits': {
                'hits': [],
                'total': 1170,
                'max_score': 0
            },
            '_shards': {
                'successful': 105,
                'failed': 0,
                'skipped': 80,
                'total': 105
            },
            'took': 19,
            'aggregations': {
                '2': {
                    'buckets': [
                        {
                            '3': {
                                'buckets': [
                                    {
                                        '1': {
                                            'value': 62
                                        },
                                        'key': 'box',
                                        'doc_count': 579
                                    },
                                    {
                                        '1': {
                                            'value': 41
                                        },
                                        'key': 'data',
                                        'doc_count': 82
                                    }
                                ],
                                'sum_other_doc_count': 0,
                                'doc_count_error_upper_bound': 0
                            },
                            'key_as_string': '2019-05-20T00:00:00.000+08:00',
                            'key': 1558281600000,
                            'doc_count': 771
                        },
                        {
                            '3': {
                                'buckets': [
                                    {
                                        '1': {
                                            'value': 54
                                        },
                                        'key': 'qrcode',
                                        'doc_count': 172
                                    }
                                ],
                                'sum_other_doc_count': 0,
                                'doc_count_error_upper_bound': 0
                            },
                            'key_as_string': '2019-05-22T00:00:00.000+08:00',
                            'key': 1558454400000,
                            'doc_count': 253
                        }
                    ]
                }
            },
            'timed_out': False
        }
        rows = []
        columns = []
        self.query_runner._parse_results({}, {}, query_result, columns, rows)
        self.assertEqual(
            [
                {
                    '2.3': 'box',
                    '2.3.1': 62,
                    '2.3.doc_count': 579,
                    '2': '2019-05-20T00:00:00.000+08:00',
                    '2.doc_count': 771
                },
                {
                    '2.3': 'data',
                    '2.3.1': 41,
                    '2.3.doc_count': 82,
                    '2': '2019-05-20T00:00:00.000+08:00',
                    '2.doc_count': 771
                },
                {
                    '2.3': 'qrcode',
                    '2.3.1': 54,
                    '2.3.doc_count': 172,
                    '2': '2019-05-22T00:00:00.000+08:00',
                    '2.doc_count': 253
                }
            ],
            rows
        )
        self.assertEqual(
            [
                {'type': 'integer', 'friendly_name': '2.doc_count', 'name': '2.doc_count'},
                {'type': 'string', 'friendly_name': '2', 'name': '2'},
                {'type': 'integer', 'friendly_name': '2.3.doc_count', 'name': '2.3.doc_count'},
                {'type': 'string', 'friendly_name': '2.3', 'name': '2.3'},
                {'type': 'integer', 'friendly_name': '2.3.1', 'name': '2.3.1'}
            ],
            columns
        )

    def test_aggregations_2(self):
        """filter and nested buckets, buckets may be a dict"""
        query_result = {
            'hits': {
                'hits': [],
                'total': 47,
                'max_score': 0
            },
            '_shards': {
                'successful': 5,
                'failed': 0,
                'skipped': 0,
                'total': 5
            },
            'took': 3,
            'aggregations': {
                '3': {
                    'buckets': [
                        {
                            '1': {
                                'value': 15
                            },
                            '4': {
                                'buckets': {
                                    'state:closed': {
                                        '1': {
                                            'value': 11
                                        },
                                        '5': {
                                            'buckets': [
                                                {
                                                    '1': {
                                                        'value': 10
                                                    },
                                                    'key': 'data self',
                                                    'doc_count': 10
                                                },
                                                {
                                                    '1': {
                                                        'value': 1
                                                    },
                                                    'key': 'unknown',
                                                    'doc_count': 1
                                                }
                                            ],
                                            'sum_other_doc_count': 0,
                                            'doc_count_error_upper_bound': 0
                                        },
                                        'doc_count': 11
                                    }
                                }
                            },
                            'key': 'data',
                            'doc_count': 15
                        },
                        {
                            '1': {
                                'value': 9
                            },
                            '4': {
                                'buckets': {
                                    'state:closed': {
                                        '1': {
                                            'value': 8
                                        },
                                        '5': {
                                            'buckets': [
                                                {
                                                    '1': {
                                                        'value': 8
                                                    },
                                                    'key': 'unknown',
                                                    'doc_count': 8
                                                }
                                            ],
                                            'sum_other_doc_count': 0,
                                            'doc_count_error_upper_bound': 0
                                        },
                                        'doc_count': 8
                                    }
                                }
                            },
                            'key': 'qrcode',
                            'doc_count': 32
                        }
                    ],
                    'sum_other_doc_count': 0,
                    'doc_count_error_upper_bound': 0
                }
            },
            'timed_out': False
        }

        rows = []
        columns = []
        self.query_runner._parse_results({}, {}, query_result, columns, rows)
        self.assertEqual(
            [
                {
                    '3.4.state:closed.5': 'data self',
                    '3.4.state:closed.5.doc_count': 10,
                    '3.4.state:closed.1': 11,
                    '3.4.state:closed.doc_count': 11,
                    '3': 'data',
                    '3.4.state:closed.5.1': 10,
                    '3.doc_count': 15,
                    '3.1': 15
                },
                {
                    '3.4.state:closed.5': 'unknown',
                    '3.4.state:closed.5.doc_count': 1,
                    '3.4.state:closed.1': 11,
                    '3.4.state:closed.doc_count': 11,
                    '3': 'data',
                    '3.4.state:closed.5.1': 1,
                    '3.doc_count': 15,
                    '3.1': 15
                },
                {
                    '3.4.state:closed.5': 'unknown',
                    '3.4.state:closed.5.doc_count': 8,
                    '3.4.state:closed.1': 8,
                    '3.4.state:closed.doc_count': 8,
                    '3': 'qrcode',
                    '3.4.state:closed.5.1': 8,
                    '3.doc_count': 32,
                    '3.1': 9
                }
            ],
            rows
        )
        self.assertEqual(
            [
                {'type': 'integer', 'friendly_name': '3.doc_count', 'name': '3.doc_count'},
                {'type': 'string', 'friendly_name': '3', 'name': '3'},
                {'type': 'integer', 'friendly_name': '3.1', 'name': '3.1'},
                {'type': 'integer', 'friendly_name': '3.4.state:closed.doc_count',
                 'name': '3.4.state:closed.doc_count'},
                {'type': 'integer', 'friendly_name': '3.4.state:closed.1', 'name': '3.4.state:closed.1'},
                {'type': 'integer', 'friendly_name': '3.4.state:closed.5.doc_count',
                 'name': '3.4.state:closed.5.doc_count'},
                {'type': 'string', 'friendly_name': '3.4.state:closed.5', 'name': '3.4.state:closed.5'},
                {'type': 'integer', 'friendly_name': '3.4.state:closed.5.1', 'name': '3.4.state:closed.5.1'}
            ],
            columns
        )

    def test_aggregations_3(self):
        """nested buckets, buckets may be a empty list"""
        query_result = {
            'status': 200,
            'hits': {
                'hits': [],
                'total': 134,
                'max_score': 0
            },
            '_shards': {
                'successful': 120,
                'failed': 0,
                'skipped': 105,
                'total': 120
            },
            'took': 16,
            'aggregations': {
                '3': {
                    'buckets': [
                        {
                            '1': {
                                'value': 38
                            },
                            '4': {
                                'buckets': {
                                    'state:closed': {
                                        '1': {
                                            'value': 37
                                        },
                                        '5': {
                                            'buckets': [
                                                {
                                                    '1': {
                                                        'value': 37
                                                    },
                                                    'key': 'unknown',
                                                    'doc_count': 37
                                                }
                                            ],
                                            'sum_other_doc_count': 0,
                                            'doc_count_error_upper_bound': 0
                                        },
                                        'doc_count': 37
                                    }
                                }
                            },
                            'key': 'data',
                            'doc_count': 75
                        },
                        {
                            '1': {
                                'value': 1
                            },
                            '4': {
                                'buckets': {
                                    'state:closed': {
                                        '1': {
                                            'value': 0
                                        },
                                        '5': {
                                            'buckets': [],
                                            'sum_other_doc_count': 0,
                                            'doc_count_error_upper_bound': 0
                                        },
                                        'doc_count': 0
                                    }
                                }
                            },
                            'key': 'merchant',
                            'doc_count': 11
                        }
                    ],
                    'sum_other_doc_count': 0,
                    'doc_count_error_upper_bound': 0
                }
            },
            'timed_out': False
        }

        rows = []
        columns = []
        self.query_runner._parse_results({}, {}, query_result, columns, rows)
        self.assertEqual(
            [
                {
                    '3.4.state:closed.5': 'unknown',
                    '3.4.state:closed.5.doc_count': 37,
                    '3.4.state:closed.1': 37,
                    '3.4.state:closed.doc_count': 37,
                    '3': 'data',
                    '3.4.state:closed.5.1': 37,
                    '3.doc_count': 75,
                    '3.1': 38
                },
                {
                    '3.4.state:closed.5': None,
                    '3.4.state:closed.5.doc_count': None,
                    '3.4.state:closed.1': 0,
                    '3.4.state:closed.doc_count': 0,
                    '3': 'merchant',
                    '3.4.state:closed.5.1': None,
                    '3.doc_count': 11,
                    '3.1': 1
                }
            ],
            rows
        )
        self.assertEqual(
            [
                {'type': 'integer', 'friendly_name': '3.doc_count', 'name': '3.doc_count'},
                {'type': 'string', 'friendly_name': '3', 'name': '3'},
                {'type': 'integer', 'friendly_name': '3.1', 'name': '3.1'},
                {'type': 'integer', 'friendly_name': '3.4.state:closed.doc_count',
                 'name': '3.4.state:closed.doc_count'},
                {'type': 'integer', 'friendly_name': '3.4.state:closed.1', 'name': '3.4.state:closed.1'},
                {'type': 'integer', 'friendly_name': '3.4.state:closed.5.doc_count',
                 'name': '3.4.state:closed.5.doc_count'},
                {'type': 'string', 'friendly_name': '3.4.state:closed.5', 'name': '3.4.state:closed.5'},
                {'type': 'integer', 'friendly_name': '3.4.state:closed.5.1', 'name': '3.4.state:closed.5.1'}
            ]
            ,
            columns
        )
