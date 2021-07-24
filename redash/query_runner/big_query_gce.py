import requests
import httplib2

try:
    from apiclient.discovery import build
    from oauth2client.contrib import gce

    enabled = True
except ImportError:
    enabled = False

from redash.query_runner import register
from .big_query import BigQuery


class BigQueryGCE(BigQuery):
    @classmethod
    def type(cls):
        return "bigquery_gce"

    @classmethod
    def enabled(cls):
        if not enabled:
            return False

        try:
            # check if we're on a GCE instance
            requests.get("http://metadata.google.internal")
        except requests.exceptions.ConnectionError:
            return False

        return True

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "totalMBytesProcessedLimit": {
                    "type": "number",
                    "title": "Total MByte Processed Limit",
                },
                "userDefinedFunctionResourceUri": {
                    "type": "string",
                    "title": "UDF Source URIs (i.e. gs://bucket/date_utils.js, gs://bucket/string_utils.js )",
                },
                "useStandardSql": {
                    "type": "boolean",
                    "title": "Use Standard SQL",
                    "default": True,
                },
                "location": {
                    "type": "string",
                    "title": "Processing Location",
                    "default": "US",
                },
                "loadSchema": {"type": "boolean", "title": "Load Schema"},
            },
        }

    def _get_project_id(self):
        return requests.get(
            "http://metadata/computeMetadata/v1/project/project-id",
            headers={"Metadata-Flavor": "Google"},
        ).content

    def _get_bigquery_service(self):
        credentials = gce.AppAssertionCredentials(
            scope="https://www.googleapis.com/auth/bigquery"
        )
        http = httplib2.Http()
        http = credentials.authorize(http)

        return build("bigquery", "v2", http=http)


register(BigQueryGCE)
