from . import register
from .elasticsearch2 import ElasticSearch2

try:
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
                "use_aws_iam_profile": {
                    "type": "boolean",
                    "title": "Use AWS IAM Profile",
                },
            },
            "secret": ["secret_key"],
            "order": [
                "server",
                "region",
                "access_key",
                "secret_key",
                "use_aws_iam_profile",
            ],
            "required": ["server", "region"],
        }

    def __init__(self, configuration):
        super(AmazonElasticsearchService, self).__init__(configuration)

        region = configuration["region"]
        cred = None
        if configuration.get("use_aws_iam_profile", False):
            cred = credentials.get_credentials(session.Session())
        else:
            cred = credentials.Credentials(
                access_key=configuration.get("access_key", ""),
                secret_key=configuration.get("secret_key", ""),
            )

        self.auth = AWSV4Sign(cred, region, "es")


register(AmazonElasticsearchService)
