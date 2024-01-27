import datetime
import time

import yaml

from redash.query_runner import BaseQueryRunner, register
from redash.utils import parse_human_time

try:
    import boto3
    from botocore.exceptions import ParamValidationError  # noqa: F401

    enabled = True
except ImportError:
    enabled = False

POLL_INTERVAL = 3
TIMEOUT = 180


def parse_response(response):
    results = response["results"]
    rows = []
    field_orders = {}

    for row in results:
        record = {}
        rows.append(record)

        for order, col in enumerate(row):
            if col["field"] == "@ptr":
                continue
            field = col["field"]
            record[field] = col["value"]
            field_orders[field] = max(field_orders.get(field, -1), order)

    fields = sorted(field_orders, key=lambda f: field_orders[f])
    cols = [
        {
            "name": f,
            "type": "datetime" if f == "@timestamp" else "string",
            "friendly_name": f,
        }
        for f in fields
    ]
    return {
        "columns": cols,
        "rows": rows,
        "metadata": {"data_scanned": response["statistics"]["bytesScanned"]},
    }


def parse_query(query):
    query = yaml.safe_load(query)

    for timeKey in ["startTime", "endTime"]:
        if isinstance(query.get(timeKey), str):
            query[timeKey] = int(parse_human_time(query[timeKey]).timestamp())
    if not query.get("endTime"):
        query["endTime"] = int(datetime.datetime.now().timestamp())

    return query


class CloudWatchInsights(BaseQueryRunner):
    should_annotate_query = False

    @classmethod
    def name(cls):
        return "Amazon CloudWatch Logs Insights"

    @classmethod
    def type(cls):
        return "cloudwatch_insights"

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

    @classmethod
    def enabled(cls):
        return enabled

    def __init__(self, configuration):
        super(CloudWatchInsights, self).__init__(configuration)
        self.syntax = "yaml"

    def test_connection(self):
        self.get_schema()

    def _get_client(self):
        cloudwatch = boto3.client(
            "logs",
            region_name=self.configuration.get("region"),
            aws_access_key_id=self.configuration.get("aws_access_key"),
            aws_secret_access_key=self.configuration.get("aws_secret_key"),
        )
        return cloudwatch

    def get_schema(self, get_stats=False):
        client = self._get_client()

        log_groups = []
        paginator = client.get_paginator("describe_log_groups")

        for page in paginator.paginate():
            for group in page["logGroups"]:
                group_name = group["logGroupName"]
                fields = client.get_log_group_fields(logGroupName=group_name)
                log_groups.append(
                    {
                        "name": group_name,
                        "columns": [field["name"] for field in fields["logGroupFields"]],
                    }
                )

        return log_groups

    def run_query(self, query, user):
        logs = self._get_client()

        query = parse_query(query)
        query_id = logs.start_query(**query)["queryId"]

        elapsed = 0
        while True:
            result = logs.get_query_results(queryId=query_id)
            if result["status"] == "Complete":
                data = parse_response(result)
                break
            if result["status"] in ("Failed", "Timeout", "Unknown", "Cancelled"):
                raise Exception("CloudWatch Insights Query Execution Status: {}".format(result["status"]))
            elif elapsed > TIMEOUT:
                raise Exception("Request exceeded timeout.")
            else:
                time.sleep(POLL_INTERVAL)
                elapsed += POLL_INTERVAL

        return data, None


register(CloudWatchInsights)
