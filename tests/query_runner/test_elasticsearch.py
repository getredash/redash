import datetime
from unittest import TestCase

from redash.query_runner.elasticsearch import ElasticSearch


class TestElasticsearch(TestCase):
    def setUp(self):

        self.aggregation_simple_query_result = {
            "aggregations": {
                "subtotal": {
                    "value": 592.0
                }
            }
        }

        self.aggregation_query_result = {
            "aggregations": {
                "agg_name": {
                    "doc_count_error_upper_bound": 0,
                    "sum_other_doc_count": 3,
                    "buckets": [
                        {
                            "key": "bucket_result_1",
                            "doc_count": 5
                        },
                        {
                            "key": "bucket_result_2",
                            "doc_count": 6
                        },
                        {
                            "key": "bucket_result_3",
                            "doc_count": 7
                        },

                    ]
                }
            }
        }

        self.sub_aggregation_query = {
            "aggregations": {
                "agg_name": {
                    "terms": {
                        "field": "random_field"
                    },
                    "aggregations": {
                        "agg_date": {
                        }
                    }
                }
            }
        }

        self.sub_aggregation_query_result = {
            "aggregations": {
                "agg_name": {
                    "buckets": [
                        {
                            "key": "subbucket_result_1",
                            "doc_count": 4,
                            "sub_agg": {
                                "buckets": [
                                    {
                                        "key_as_string": "2019-05-10 00:00",
                                        "key": 1557446400000,
                                        "doc_count": 3
                                    },
                                    {
                                        "key_as_string": "2019-05-11 00:00",
                                        "key": 1557532800000,
                                        "doc_count": 2
                                    },
                                    {
                                        "key_as_string": "2019-05-12 00:00",
                                        "key": 1557619200000,
                                        "doc_count": 1
                                    }
                                ]
                            }
                        },
                        {
                            "key": "subbucket_result_2",
                            "doc_count": 15,
                            "sub_agg": {
                                "buckets": [
                                    {
                                        "key_as_string": "2019-05-10 00:00",
                                        "key": 1557446400000,
                                        "doc_count": 6
                                    },
                                    {
                                        "key_as_string": "2019-05-11 00:00",
                                        "key": 1557532800000,
                                        "doc_count": 5
                                    },
                                    {
                                        "key_as_string": "2019-05-12 00:00",
                                        "key": 1557619200000,
                                        "doc_count": 4
                                    }
                                ]
                            }
                        }
                    ]
                },
            },
        }

        self.sub_aggregation_cardinality = {
            "aggregations": {
                "agg_name": {
                    "buckets": [
                        {
                            "key_as_string": "2018-10-01T00:00:00+0000",
                            "key": 1538352000000,
                            "doc_count": 149,
                            "sub_agg": {
                                "value": 1
                            }
                        },
                        {
                            "key_as_string": "2018-10-08T00:00:00+0000",
                            "key": 1538956800000,
                            "doc_count": 82,
                            "sub_agg": {
                                "value": 1
                            }
                        }
                    ]
                }
            }
        }

    def test_get_aggregation(self):
        query_runner = ElasticSearch({"server": "http://localhost:9200"})
        rows = []
        columns = []
        query_runner._parse_results({}, {}, self.aggregation_query_result, columns, rows)
        self.assertEqual(
            [
                {'friendly_name': 'agg_name>sum_other_doc_count',
                  'name': 'agg_name>sum_other_doc_count',
                  'type': 'integer'},
                 {'friendly_name': 'agg_name>doc_count_error_upper_bound',
                  'name': 'agg_name>doc_count_error_upper_bound',
                  'type': 'integer'},
                 {'friendly_name': 'agg_name', 'name': 'agg_name', 'type': 'string'},
                 {'friendly_name': 'agg_name>doc_count',
                  'name': 'agg_name>doc_count',
                  'type': 'integer'}
            ],
            columns
        )
        self.assertEqual(
            [
                {'agg_name': 'bucket_result_1',
                  'agg_name>doc_count': 5,
                  'agg_name>doc_count_error_upper_bound': 0,
                  'agg_name>sum_other_doc_count': 3},
                 {'agg_name': 'bucket_result_2',
                  'agg_name>doc_count': 6,
                  'agg_name>doc_count_error_upper_bound': 0,
                  'agg_name>sum_other_doc_count': 3},
                 {'agg_name': 'bucket_result_3',
                  'agg_name>doc_count': 7,
                  'agg_name>doc_count_error_upper_bound': 0,
                  'agg_name>sum_other_doc_count': 3}
            ],
            rows
        )

    def test_get_simple_aggregation(self):
        query_runner = ElasticSearch({"server": "http://localhost:9200"})
        rows = []
        columns = []
        query_runner._parse_results({}, {}, self.aggregation_simple_query_result, columns, rows)
        self.assertEqual(
            [
                {'friendly_name': 'subtotal>value', 'name': 'subtotal>value', 'type': 'float'}
            ],
            columns
        )
        self.assertEqual(
            [
                {'subtotal>value': 592.0}
            ],
            rows
        )

    def test_get_sub_aggregation(self):
        query_runner = ElasticSearch({"server": "http://localhost:9200"})
        rows = []
        columns = []
        query_runner._parse_results({}, {}, self.sub_aggregation_query_result, columns, rows)
        self.assertEqual(
            [
                {'friendly_name': 'agg_name', 'name': 'agg_name', 'type': 'string'},
                {'friendly_name': 'agg_name>doc_count', 'name': 'agg_name>doc_count', 'type': 'integer'},
                {'friendly_name': 'sub_agg', 'name': 'sub_agg', 'type': 'string'},
                {'friendly_name': 'sub_agg>doc_count', 'name': 'sub_agg>doc_count', 'type': 'integer'}
            ],
            columns
        )
        self.assertEqual(
            [
                {'agg_name': 'subbucket_result_1', 'agg_name>doc_count': 4, 'sub_agg>doc_count': 3,
                 'sub_agg': '2019-05-10 00:00'},
                {'agg_name': 'subbucket_result_1', 'agg_name>doc_count': 4, 'sub_agg>doc_count': 2,
                 'sub_agg': '2019-05-11 00:00'},
                {'agg_name': 'subbucket_result_1', 'agg_name>doc_count': 4, 'sub_agg>doc_count': 1,
                 'sub_agg': '2019-05-12 00:00'},
                {'agg_name': 'subbucket_result_2', 'agg_name>doc_count': 15, 'sub_agg>doc_count': 6,
                 'sub_agg': '2019-05-10 00:00'},
                {'agg_name': 'subbucket_result_2', 'agg_name>doc_count': 15, 'sub_agg>doc_count': 5,
                 'sub_agg': '2019-05-11 00:00'},
                {'agg_name': 'subbucket_result_2', 'agg_name>doc_count': 15, 'sub_agg>doc_count': 4,
                 'sub_agg': '2019-05-12 00:00'},
            ],
            rows
        )

    def test_get_sub_aggregation_card(self):
        query_runner = ElasticSearch({"server": "http://localhost:9200"})
        rows = []
        columns = []
        query_runner._parse_results({}, {}, self.sub_aggregation_cardinality, columns, rows)
        self.assertEqual(
            [
                {'friendly_name': 'agg_name>sub_agg>value', 'name': 'agg_name>sub_agg>value', 'type': 'float'},
                {'friendly_name': 'agg_name', 'name': 'agg_name', 'type': 'string'},
                {'friendly_name': 'agg_name>doc_count', 'name': 'agg_name>doc_count', 'type': 'integer'}
            ],
            columns
        )
        self.assertEqual(
            [
                {'agg_name': '2018-10-01T00:00:00+0000', 'agg_name>doc_count': 149, 'agg_name>sub_agg>value': 1},
                {'agg_name': '2018-10-08T00:00:00+0000', 'agg_name>doc_count': 82, 'agg_name>sub_agg>value': 1}
            ],
            rows
        )
