import logging
from .elasticsearch import BaseElasticSearch, ElasticSearch
from . import register
from redash.utils import json_loads

try:
    from requests_aws_sign import AWSV4Sign
    from botocore import session, credentials

    enabled = True
except ImportError:
    enabled = False

logger = logging.getLogger(__name__)

class AmazonElasticsearchService(ElasticSearch):
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

    def run_query(self, query, user):
        logger.debug("Input query: %s", query)
        query = json_loads(query)
        mode = query.pop("mode", "json")
        if mode == "sql":
            sql = query.pop("query", "")
            index, query, url, result_fields = self._build_sql_query(sql)
        else:
            index, query, url, result_fields = self._build_query(query)
        return self._get_query(url, query, index, result_fields)

    def _build_sql_query(self, query):
        sql_query = {
            'query': query
        }
        sql_query_url = '/_opendistro/_sql'
        return None, sql_query, sql_query_url, None

class AmazonElasticsearchSqlService(AmazonElasticsearchService):
    @classmethod
    def name(cls):
        return "Amazon Elasticsearch Service (with SQL)"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def type(cls):
        return "aws_es_sql"

    def __init__(self, configuration):
        super(AmazonElasticsearchSqlService, self).__init__(configuration)
        self.syntax = 'sql'

    def run_query(self, query, user):
        logger.debug("Input query: %s", query)
        index, query, url, result_fields = self._build_query(query)
        return self._get_query(url, query, index, result_fields)

    def _build_query(self, query):
        return self._build_sql_query(query)


register(AmazonElasticsearchService)
register(AmazonElasticsearchSqlService)