import os
import logging
import boto3
import requests
import simplejson
import json
import re
import itertools

import redash.models

from flask import request
from flask_login import current_user
from redash.query_runner import *
from redash.utils import JSONEncoder
from redash.settings import array_from_string


logger = logging.getLogger(__name__)

types_map = {
    'Timestamp': TYPE_DATETIME,
    'SampleCount': TYPE_FLOAT,
    'Average': TYPE_FLOAT,
    'Sum': TYPE_FLOAT,
    'Minimum': TYPE_FLOAT,
    'Maximum': TYPE_FLOAT,
    'Unit': TYPE_STRING,
    'ExtendedStatistics': TYPE_FLOAT
}

def list_all_ns_metrics(client, ns):
    options = {}

    if ns is not None:
        options['Namespace'] = ns

    curr = client.list_metrics(**options)
    result = curr.get('Metrics')

    while 'NextToken' in curr:
        options['NextToken'] = curr.get('NextToken')
        curr = client.list_metrics(**options)
        result += curr.get('Metrics')
    
    return result


class CloudWatch(BaseQueryRunner):
    def run_query(self, query, user):
        try:
            json_query = simplejson.loads(query)
            client = self._get_client()
            response = client.get_metric_statistics(**json_query)

            statistic_columns = [(s, types_map.get(s, None)) for s in json_query.get('Statistics', [])]
            extended_columns = [(e, TYPE_FLOAT) for e in json_query.get('ExtendedStatistics', [])]
            columns = self.fetch_columns([('Timestamp', TYPE_DATETIME)] + statistic_columns + extended_columns)
            rows = response.get('Datapoints', [])

            data = { 'columns': columns, 'rows': rows }
            error = None
            json_data = json.dumps(data, cls=JSONEncoder)
        except (KeyboardInterrupt, InterruptException):
            error = "Query cancelled by user"
            json_data = None
        return json_data, error

    def test_connection(self):
        client = self._get_client()
        response = client.list_metrics()
        return True

    def get_schema(self, get_stats=False):
        client = self._get_client()
        response = list(itertools.chain.from_iterable(list_all_ns_metrics(client, ns) for ns in self.whitelist))
        schema = {}
        namespaces = []

        for metric in response:
            name = metric['MetricName']
            ns = metric['Namespace']

            if name not in schema:
                schema[name] = { 'name': name, 'columns': [], 'ns': ns }
            if ns not in namespaces:
                namespaces.append(ns)
                
            schema[name]['columns'] = list(set(schema[name]['columns'] + ['%s=%s' % (dim['Name'], dim['Value']) for dim in metric['Dimensions']]))

        if len(namespaces):
            schema['meta'] = { 'name': '_ns', 'columns' : namespaces }

        return schema.values()

    @property
    def whitelist(self):
        _namespaces = self.configuration.get('namespaces', '*')

        if _namespaces is '*':
            return [None]
        
        return array_from_string(_namespaces)

    @classmethod
    def annotate_query(cls):
        return False

    @classmethod
    def cacheable(cls):
        return False

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "id": {
                    "title": "Access Key ID",
                    "type": "string"
                },
                "key": {
                    "title": "Secret Access Key",
                    "type": "string"
                },
                "region": {
                    "title": "Default Region",
                    "type": "string",
                    "options": [
                        "us-east-1",
                        "us-east-2",
                        "us-west-1",
                        "us-west-2",
                        "ap-northeast-1",
                        "ap-northeast-2",
                        "ap-northeast-3",
                        "ap-south-1",
                        "ap-southeast-1",
                        "ap-southeast-2",
                        "ca-central-1",
                        "cn-north-1",
                        "cn-northwest-1",
                        "eu-central-1",
                        "eu-west-1",
                        "eu-west-2",
                        "eu-west-3",
                        "sa-east-1",
                        "us-gov-west-1"
                    ],
                    "default": "us-east-1"
                },
                "namespaces": {
                    "title": "Namespace Whitelist",
                    "type": "string",
                    "default": "*"
                }
            },
            "required": ["id", "key", "region"],
            "secret": ["key"],
            "order": ["id", "key", "region", "customMetrics"]
        }

    def _get_client(self):
        return boto3.client(
            'cloudwatch',
            aws_access_key_id=self.configuration.get('id'),
            aws_secret_access_key=self.configuration.get('key'),
            region_name=self.configuration.get('region')
        )


register(CloudWatch)