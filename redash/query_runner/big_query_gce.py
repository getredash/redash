import requests

try:
    import google.auth
    from apiclient.discovery import build

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
        google.auth.default()[1]

    def _get_bigquery_service(self):
        creds = google.auth.default(scopes=["https://www.googleapis.com/auth/bigquery"])[0]
        return build("bigquery", "v2", credentials=creds, cache_discovery=False)


register(BigQueryGCE)
