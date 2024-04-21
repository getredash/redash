from . import register
from .elasticsearch2 import ElasticSearch2

try:
    import boto3
    from botocore import credentials, session
    from requests_aws_sign import AWSV4Sign

    enabled = True
except ImportError:
    enabled = False


class AmazonElasticsearchService(ElasticSearch2):
    @classmethod
    def name(cls):
        return "Amazon Elasticsearch Service"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def type(cls):
        return "aws_es"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "server": {"type": "string", "title": "Endpoint"},
                "region": {"type": "string"},
                "access_key": {"type": "string", "title": "Access Key"},
                "secret_key": {"type": "string", "title": "Secret Key"},
                "iam_role": {"type": "string", "title": "IAM role to assume"},
                "external_id": {
                    "type": "string",
                    "title": "External ID to be used while STS assume role",
                },
            },
            "secret": ["secret_key"],
            "order": [
                "server",
                "region",
                "access_key",
                "secret_key",
                "iam_role",
                "external_id",
            ],
            "required": ["server", "region"],
        }

    def __init__(self, configuration):
        super(AmazonElasticsearchService, self).__init__(configuration)
        region = configuration["region"]
        args = {
            "region_name": region,
            "aws_access_key_id": configuration.get("access_key", None),
            "aws_secret_access_key": configuration.get("secret_key", None),
        }
        if configuration.get("iam_role"):
            role_session_name = "redash"
            sts = boto3.client("sts", **args)
            creds = sts.assume_role(
                RoleArn=configuration.get("iam_role"),
                RoleSessionName=role_session_name,
                ExternalId=configuration.get("external_id"),
            )
            args = {
                "aws_access_key_id": creds["Credentials"]["AccessKeyId"],
                "aws_secret_access_key": creds["Credentials"]["SecretAccessKey"],
                "aws_session_token": creds["Credentials"]["SessionToken"],
                "region_name": region,
            }
        cred = credentials.get_credentials(session.Session(**args))
        self.auth = AWSV4Sign(cred, region, "es")

    def get_auth(self):
        return self.auth


register(AmazonElasticsearchService)
