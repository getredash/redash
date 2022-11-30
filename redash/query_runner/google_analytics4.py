import logging
import requests
from base64 import b64decode
from redash.query_runner import BaseQueryRunner

from redash.query_runner import *
from redash.utils import json_dumps, json_loads
import datetime

logger = logging.getLogger(__name__)

try:
    from oauth2client.service_account import ServiceAccountCredentials
    from apiclient.discovery import build
    from apiclient.errors import HttpError
    import httplib2

    enabled = True
except ImportError as e:
    enabled = False

types_conv = dict(
    STRING=TYPE_STRING,
    INTEGER=TYPE_INTEGER,
    FLOAT=TYPE_FLOAT,
    DATE=TYPE_DATE,
    DATETIME=TYPE_DATETIME,
)

ga_report_endpoint = "https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}:runReport"
ga_metadata_endpoint = "https://analyticsdata.googleapis.com/v1beta/properties/{propertyId}/metadata"


def parse_ga_response(response):
    columns = []
    for h in response['dimensionHeaders']:
        data_type = None
        if h['name'] == "date":
            data_type = "DATE"
        columns.append(
            {
                "name": h['name'],
                "friendly_name": h['name'],
                "type": types_conv.get(data_type, "string"),
            }
        )

    for h in response['metricHeaders']:
        data_type = None
        if h['name'] == "date":
            data_type = "DATE"
        columns.append(
            {
                "name": h['name'],
                "friendly_name": h['name'],
                "type": types_conv.get(data_type, "string"),
            }
        )

    rows = []
    for r in response['rows']:
        counter = 0
        d = {}
        for item in r['dimensionValues']:
            column_name = columns[counter]["name"]
            column_type = [col for col in columns if col["name"] == column_name][0][
                "type"
            ]
            value = item['value']

            if column_type == TYPE_DATE:
                value = datetime.datetime.strptime(value, "%Y%m%d")
            elif column_type == TYPE_DATETIME:
                if len(value) == 10:
                    value = datetime.datetime.strptime(value, "%Y%m%d%H")
                elif len(value) == 12:
                    value = datetime.datetime.strptime(value, "%Y%m%d%H%M")
                else:
                    raise Exception(
                        "Unknown date/time format in results: '{}'".format(value)
                    )

            d[column_name] = value
            counter = counter + 1

        for item in r['metricValues']:
            column_name = columns[counter]["name"]
            column_type = [col for col in columns if col["name"] == column_name][0][
                "type"
            ]
            value = item['value']

            if column_type == TYPE_DATE:
                value = datetime.datetime.strptime(value, "%Y%m%d")
            elif column_type == TYPE_DATETIME:
                if len(value) == 10:
                    value = datetime.datetime.strptime(value, "%Y%m%d%H")
                elif len(value) == 12:
                    value = datetime.datetime.strptime(value, "%Y%m%d%H%M")
                else:
                    raise Exception(
                        "Unknown date/time format in results: '{}'".format(value)
                    )

            d[column_name] = value
            counter = counter + 1

        rows.append(d)

    return {"columns": columns, "rows": rows}


class GoogleAnalytics4(BaseQueryRunner):
    should_annotate_query = False

    @classmethod
    def type(cls):
        return "google_analytics4"

    @classmethod
    def name(cls):
        return "Google Analytics 4"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "propertyId": {
                    "type": "number",
                    "title": "Property Id"
                },
                "jsonKeyFile": {
                    "type": "string",
                    "title": "JSON Key File"
                }
            },
            "required": ["propertyId", "jsonKeyFile"],
            "secret": ["jsonKeyFile"],
        }

    def _get_access_token(self):
        key = json_loads(b64decode(self.configuration["jsonKeyFile"]))

        scope = ["https://www.googleapis.com/auth/analytics.readonly"]
        creds = ServiceAccountCredentials.from_json_keyfile_dict(key, scope)

        build("analyticsdata", "v1beta", http=creds.authorize(httplib2.Http()))

        return creds.access_token

    def run_query(self, query, user):
        access_token = self._get_access_token()
        params = json_loads(query)

        property_id = self.configuration["propertyId"]

        headers = {
            'Content-Type': "application/json",
            'Authorization': f"Bearer {access_token}"
        }

        url = ga_report_endpoint.replace("{propertyId}", str(property_id))
        r = requests.post(url, json=params, headers=headers)
        r.raise_for_status()

        raw_result = r.json()

        data = parse_ga_response(raw_result)

        error = None
        json_data = json_dumps(data)

        return json_data, error

    def test_connection(self):
        try:
            access_token = self._get_access_token()
            property_id = self.configuration["propertyId"]

            url = ga_metadata_endpoint.replace("{propertyId}", str(property_id))

            headers = {
                'Content-Type': "application/json",
                'Authorization': f"Bearer {access_token}"
            }

            r = requests.get(url, headers=headers)
            r.raise_for_status()
        except Exception as e:
            raise Exception(e)


register(GoogleAnalytics4)
