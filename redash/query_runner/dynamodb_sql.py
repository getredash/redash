import logging

from redash.query_runner import (
    TYPE_BOOLEAN,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseQueryRunner,
    register,
)
from redash.utils import json_dumps

logger = logging.getLogger(__name__)

try:
    import boto3
    from boto3.dynamodb.types import TypeDeserializer

    enabled = True
except ImportError:
    enabled = False
    TypeDeserializer = None


def _infer_redash_type(dynamodb_attr):
    """Infer Redash column type from a DynamoDB attribute value (e.g. {'S': 'foo'})."""
    if not isinstance(dynamodb_attr, dict) or len(dynamodb_attr) != 1:
        return TYPE_STRING
    key = next(iter(dynamodb_attr))
    if key == "S":
        return TYPE_STRING
    if key == "N":
        try:
            s = dynamodb_attr["N"]
            if "." in s:
                float(s)
                return TYPE_FLOAT
            int(s)
            return TYPE_INTEGER
        except (ValueError, TypeError):
            return TYPE_FLOAT
    if key == "BOOL":
        return TYPE_BOOLEAN
    if key == "NULL":
        return TYPE_STRING
    # L, M, SS, NS, BS, B -> display as JSON string
    return TYPE_STRING


class DynamoDBSQL(BaseQueryRunner):
    should_annotate_query = False

    @classmethod
    def name(cls):
        return "Amazon DynamoDB"

    @classmethod
    def type(cls):
        return "dynamodb_sql"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "region": {"type": "string", "title": "AWS Region", "default": "us-east-1"},
                "aws_access_key": {"type": "string", "title": "AWS Access Key"},
                "aws_secret_key": {"type": "string", "title": "AWS Secret Key"},
                "endpoint_url": {"type": "string", "title": "Endpoint URL (optional)"},
            },
            "required": ["region", "aws_access_key", "aws_secret_key"],
            "order": ["region", "aws_access_key", "aws_secret_key", "endpoint_url"],
            "secret": ["aws_secret_key"],
        }

    def _get_client(self):
        kwargs = {
            "region_name": self.configuration.get("region"),
            "aws_access_key_id": self.configuration.get("aws_access_key"),
            "aws_secret_access_key": self.configuration.get("aws_secret_key"),
        }
        endpoint_url = self.configuration.get("endpoint_url")
        if endpoint_url and endpoint_url.strip():
            kwargs["endpoint_url"] = endpoint_url.strip()
        return boto3.client("dynamodb", **kwargs)

    def _parse_items(self, items):
        """Deserialize DynamoDB Items into rows and columns for Redash."""
        deserializer = TypeDeserializer()
        column_names = []
        column_types = {}
        rows = []

        for item in items:
            row = {}
            for key, value in item.items():
                if key not in column_types:
                    column_names.append(key)
                    column_types[key] = _infer_redash_type(value)
                deserialized = deserializer.deserialize(value)
                if isinstance(deserialized, (dict, list, set)):
                    deserialized = json_dumps(deserialized)
                row[key] = deserialized
            rows.append(row)

        columns = [
            {"name": c, "friendly_name": c, "type": column_types[c]}
            for c in column_names
        ]
        return rows, columns

    def run_query(self, query, user):
        query = query.strip().rstrip(";")
        if not query:
            return None, "Query is empty."

        client = self._get_client()
        try:
            items = []
            kwargs = {"Statement": query}
            while True:
                response = client.execute_statement(**kwargs)
                items.extend(response.get("Items", []))
                next_token = response.get("NextToken")
                if not next_token:
                    break
                kwargs["NextToken"] = next_token

            rows, columns = self._parse_items(items)
            return {"columns": columns, "rows": rows}, None
        except Exception as e:
            logger.exception("DynamoDB execute_statement failed")
            return None, str(e)

    def get_schema(self, get_stats=False):
        client = self._get_client()
        tables = []
        paginator = client.get_paginator("list_tables")
        for page in paginator.paginate():
            for table_name in page["TableNames"]:
                try:
                    desc = client.describe_table(TableName=table_name)
                    columns = [
                        attr["AttributeName"]
                        for attr in desc["Table"]["AttributeDefinitions"]
                    ]
                    tables.append({"name": table_name, "columns": columns})
                except Exception:
                    tables.append({"name": table_name, "columns": []})
        return tables

    def test_connection(self):
        client = self._get_client()
        client.list_tables(Limit=1)


register(DynamoDBSQL)
