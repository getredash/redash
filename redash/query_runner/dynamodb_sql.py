import logging
import os

from redash.query_runner import *
from redash.settings import parse_boolean
from redash.utils import json_dumps

logger = logging.getLogger(__name__)
ASSUME_ROLE = parse_boolean(os.environ.get("DYNAMODB_SQL_ASSUME_ROLE", "false"))

try:
    import boto3
    from dql import FragmentEngine
    from dynamo3 import DynamoDBError
    from pyparsing import ParseException

    enabled = True
except ImportError as e:
    enabled = False

types_map = {
    "UNICODE": TYPE_INTEGER,
    "TINYINT": TYPE_INTEGER,
    "SMALLINT": TYPE_INTEGER,
    "INT": TYPE_INTEGER,
    "DOUBLE": TYPE_FLOAT,
    "DECIMAL": TYPE_FLOAT,
    "FLOAT": TYPE_FLOAT,
    "REAL": TYPE_FLOAT,
    "BOOLEAN": TYPE_BOOLEAN,
    "TIMESTAMP": TYPE_DATETIME,
    "DATE": TYPE_DATETIME,
    "CHAR": TYPE_STRING,
    "STRING": TYPE_STRING,
    "VARCHAR": TYPE_STRING,
}


class DynamoDBSQL(BaseSQLQueryRunner):
    should_annotate_query = False

    @classmethod
    def configuration_schema(cls):
        schema = {
            "type": "object",
            "properties": {
                "region": {"type": "string", "default": "us-east-1"},
                "access_key": {"type": "string"},
                "secret_key": {"type": "string"},
            },
            "secret": ["secret_key"],
        }

        if ASSUME_ROLE:
            del schema["properties"]["access_key"]
            del schema["properties"]["secret_key"]
            schema["secret"] = []
            schema["properties"].update(
                {
                    "iam_role": {"type": "string", "title": "IAM role to assume"},
                    "external_id": {
                        "type": "string",
                        "title": "External ID to be used while STS assume role",
                    },
                }
            )
        else:
            schema["required"] = ["access_key", "secret_key"]

        return schema

    def test_connection(self):
        engine = self._connect()
        list(engine.connection.list_tables())

    @classmethod
    def type(cls):
        return "dynamodb_sql"

    @classmethod
    def name(cls):
        return "DynamoDB (with DQL)"

    def _get_iam_credentials(self, user=None):
        if ASSUME_ROLE:
            role_session_name = "redash" if user is None else user.email
            sts = boto3.client("sts")
            creds = sts.assume_role(
                RoleArn=self.configuration["iam_role"],
                RoleSessionName=role_session_name,
                ExternalId=self.configuration.get("external_id"),
            )
            return {
                "aws_access_key_id": creds["Credentials"]["AccessKeyId"],
                "aws_secret_access_key": creds["Credentials"]["SecretAccessKey"],
                "aws_session_token": creds["Credentials"]["SessionToken"],
                "region_name": self.configuration["region"],
            }
        else:
            return {
                "aws_access_key_id": self.configuration.get("access_key", None),
                "aws_secret_access_key": self.configuration.get("secret_key", None),
                "region_name": self.configuration["region"],
            }

    def _connect(self):
        engine = FragmentEngine()
        config = self.configuration.to_dict()

        config["session"] = boto3.Session(**self._get_iam_credentials())._session

        if ASSUME_ROLE:
            del config["iam_role"]
            del config["external_id"]

        if not config.get("region"):
            config["region"] = "us-east-1"

        if config.get("host") == "":
            config["host"] = None

        engine.connect(**config)

        return engine

    def _get_tables(self, schema):
        engine = self._connect()

        # We can't use describe_all because sometimes a user might give List permission
        # for * (all tables), but describe permission only for some of them.
        tables = engine.connection.list_tables()
        for table_name in tables:
            try:
                table = engine.describe(table_name, True)
                schema[table.name] = {
                    "name": table.name,
                    "columns": list(table.attrs.keys()),
                }
            except DynamoDBError:
                pass

    def run_query(self, query, user):
        engine = None
        try:
            engine = self._connect()

            if not query.endswith(";"):
                query = query + ";"

            result = engine.execute(query)

            columns = []
            rows = []

            # When running a count query it returns the value as a string, in which case
            # we transform it into a dictionary to be the same as regular queries.
            if isinstance(result, str):
                # when count < scanned_count, dql returns a string with number of rows scanned
                value = result.split(" (")[0]
                if value:
                    value = int(value)
                result = [{"value": value}]

            for item in result:
                if not columns:
                    for k, v in item.items():
                        columns.append(
                            {
                                "name": k,
                                "friendly_name": k,
                                "type": types_map.get(str(type(v)).upper(), None),
                            }
                        )
                rows.append(item)

            data = {"columns": columns, "rows": rows}
            json_data = json_dumps(data)
            error = None
        except ParseException as e:
            error = "Error parsing query at line {} (column {}):\n{}".format(
                e.lineno, e.column, e.line
            )
            json_data = None
        except (KeyboardInterrupt, JobTimeoutException):
            if engine and engine.connection:
                engine.connection.cancel()
            raise

        return json_data, error


register(DynamoDBSQL)
