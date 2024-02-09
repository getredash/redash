import logging
import sys
import boto3

from redash.query_runner import *
from redash.utils import json_dumps, json_loads

import pandas as pd

logger = logging.getLogger(__name__)

try:
    from dql import Engine, FragmentEngine
    from dynamo3 import DynamoDBError
    from pyparsing import ParseException
    enabled = True
except ImportError as e:
    enabled = False

TYPES_MAP = {
    "bool": TYPE_BOOLEAN,
    "datetime64[ns]": TYPE_DATETIME,
    "datetime64[s]": TYPE_DATETIME,
    "float64": TYPE_FLOAT,
    "int64": TYPE_INTEGER,
    "object": TYPE_STRING
}


class DynamoDB(BaseSQLQueryRunner):
    should_annotate_query = False

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "region": {
                    "type": "string",
                    "default": "us-east-1"
                },
                "aws_iam_role_arn": {"type": "string", "title": "IAM Role ARN"},
            },
            "required": ["aws_iam_role_arn"],
        }
    
    def _get_client(self):
        sts = boto3.client('sts')
        response = sts.assume_role(
            RoleArn=self.configuration.get('aws_iam_role_arn'),
            RoleSessionName="redash-session"
        )
        dynamodb = boto3.client(
            "dynamodb",
            region_name=self.configuration.get("region"),
            aws_access_key_id=response['Credentials']['AccessKeyId'],
            aws_secret_access_key=response['Credentials']['SecretAccessKey'],
            aws_session_token=response["Credentials"]["SessionToken"]
        )
        logger.info("-----------DynamoDB client created------------")
        return dynamodb
    
    def test_connection(self):
        dynamodb_client = self._get_client()
        dynamodb_client.close()


    @classmethod
    def type(cls):
        return "dynamodb"

    @classmethod
    def name(cls):
        return "DynamoDB"

    # def _connect(self):
    #     sts = boto3.client('sts')
    #     response = sts.assume_role(
    #         RoleArn=self.configuration.get('aws_iam_role_arn'),
    #         RoleSessionName="redash-session"
    #     )
        
    #     engine = FragmentEngine()
    #     logger.info("-----------FragmentEngine Created------------")
        
    #     config = self.configuration.to_dict()

    #     if not config.get('region'):
    #         config['region'] = 'us-east-1'

    #     if config.get('host') == '':
    #         config['host'] = None

    #     config['access_key'] = response['Credentials']['AccessKeyId']
    #     config['secret_key'] = response['Credentials']['SecretAccessKey']
    #     config.pop('aws_iam_role_arn')
        
    #     engine.connect(**config)
    #     logger.info("-----------FragmentEngine Connected to DynamoDB------------")
        
    #     return engine

    # def _get_tables(self, schema):
    #     engine = self._connect()

    #     # We can't use describe_all because sometimes a user might give List permission
    #     # for * (all tables), but describe permission only for some of them.
    #     tables = engine.connection.list_tables()
    #     for table_name in tables:
    #         try:
    #             table = engine.describe(table_name, True)
    #             schema[table.name] = {'name': table.name,
    #                                   'columns': table.attrs.keys()}
    #         except DynamoDBError:
    #             pass

    def run_query(self, query, user):
        dynamodb_client = None
        try:
            dynamodb_client = self._get_client()

            # if not query.endswith(';'):
            #     query = query + ';'

            result = dynamodb_client.execute_statement(Statement=query)
            logger.info("----------------Query has been executed!-----------------")
            logger.info("JSON Dump: %s", json_dumps(result))
            df = pd.DataFrame([i.decode('utf-8') for i in results['Items']])
            logger.info("DataFrame: %s", df.to_string())

            columns = []
            rows = df.to_dict('records')

            for col in df.columns:
                columns.append(
                    {
                        "name": col,
                        "friendly_name": col,
                        "type": TYPES_MAP[str(df[col].dtype)]
                    }
                )

            # # When running a count query it returns the value as a string, in which case
            # # we transform it into a dictionary to be the same as regular queries.
            # if isinstance(result, basestring):
            #     # when count < scanned_count, dql returns a string with number of rows scanned
            #     value = result.split(" (")[0]
            #     if value:
            #         value = int(value)
            #     result = [{"value": value}]

            # for item in result:
            #     if not columns:
            #         for k, v in item.iteritems():
            #             columns.append({
            #                 'name': k,
            #                 'friendly_name': k,
            #                 'type': types_map.get(str(type(v)).upper(), None)
            #             })
            #     rows.append(item)

            # Returning the query results in Redash format
            data = {"columns": columns, "rows": rows}
            error = None
            json_data = json_dumps(data)
        except ParseException as e:
            error = u"Error parsing query at line {} (column {}):\n{}".format(e.lineno, e.column, e.line)
            json_data = None
        except (SyntaxError, RuntimeError) as e:
            error = e.message
            json_data = None
        except KeyboardInterrupt:
            if engine and engine.connection:
                engine.connection.cancel()
            error = "Query cancelled by user."
            json_data = None
        finally:
            dynamodb_client.close()
        return json_data, error


register(DynamoDB)