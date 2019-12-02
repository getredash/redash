import boto3
import yaml
import datetime

from redash.query_runner import BaseQueryRunner, register
from redash.utils import json_dumps


def parse_response(results):
    columns = [
        {"name": "id", "type": "string"},
        {"name": "label", "type": "string"},
        {"name": "timestamp", "type": "datetime"},
        {"name": "value", "type": "float"},
    ]

    rows = []

    for metric in results:
        for i, value in enumerate(metric["Values"]):
            rows.append(
                {
                    "id": metric["Id"],
                    "label": metric["Label"],
                    "timestamp": metric["Timestamps"][i],
                    "value": value,
                }
            )

    return rows, columns


class CloudWatch(BaseQueryRunner):
    should_annotate_query = False

    @classmethod
    def name(cls):
        return "Amazon CloudWatch"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "region": {"type": "string", "title": "AWS Region"},
                "aws_access_key": {"type": "string", "title": "AWS Access Key"},
                "aws_secret_key": {"type": "string", "title": "AWS Secret Key"},
            },
            "required": ["region", "aws_access_key", "aws_secret_key"],
            "order": ["region", "aws_access_key", "aws_secret_key"],
            "secret": ["aws_secret_key"],
        }

    def __init__(self, configuration):
        super(CloudWatch, self).__init__(configuration)
        self.syntax = "yaml"

    def test_connection(self):
        self.get_schema()

    def _get_client(self):
        cloudwatch = boto3.client(
            "cloudwatch",
            region_name=self.configuration.get("region"),
            aws_access_key_id=self.configuration.get("aws_access_key"),
            aws_secret_access_key=self.configuration.get("aws_secret_key"),
        )
        return cloudwatch

    def get_schema(self, get_stats=False):
        client = self._get_client()

        paginator = client.get_paginator("list_metrics")

        metrics = {}
        for page in paginator.paginate():
            for metric in page["Metrics"]:
                if metric["Namespace"] not in metrics:
                    metrics[metric["Namespace"]] = {
                        "name": metric["Namespace"],
                        "columns": [],
                    }

                if metric["MetricName"] not in metrics[metric["Namespace"]]["columns"]:
                    metrics[metric["Namespace"]]["columns"].append(metric["MetricName"])

        return list(metrics.values())

    def run_query(self, query, user):
        cloudwatch = self._get_client()

        query = yaml.safe_load(query)

        results = []
        paginator = cloudwatch.get_paginator("get_metric_data")
        for page in paginator.paginate(**query):
            results += page["MetricDataResults"]

        rows, columns = parse_response(results)

        return json_dumps({"rows": rows, "columns": columns}), None


register(CloudWatch)
