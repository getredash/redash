import datetime
import logging
from base64 import b64decode

import requests

from redash.query_runner import (
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseQueryRunner,
    register,
)
from redash.utils import json_loads

logger = logging.getLogger(__name__)

try:
    import google.auth
    import google.auth.transport.requests
    from google.oauth2.service_account import Credentials

    enabled = True
except ImportError:
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


def format_column_value(column_name, value, columns):
    column_type = [col for col in columns if col["name"] == column_name][0]["type"]

    if column_type == TYPE_DATE:
        value = datetime.datetime.strptime(value, "%Y%m%d")
    elif column_type == TYPE_DATETIME:
        if len(value) == 10:
            value = datetime.datetime.strptime(value, "%Y%m%d%H")
        elif len(value) == 12:
            value = datetime.datetime.strptime(value, "%Y%m%d%H%M")
        else:
            raise Exception("Unknown date/time format in results: '{}'".format(value))

    return value


def get_formatted_column_json(column_name):
    data_type = None

    if column_name == "date":
        data_type = "DATE"
    elif column_name == "dateHour":
        data_type = "DATETIME"

    result = {
        "name": column_name,
        "friendly_name": column_name,
        "type": types_conv.get(data_type, "string"),
    }

    return result


def parse_ga_response(response):
    columns = []

    for dim_header in response["dimensionHeaders"]:
        columns.append(get_formatted_column_json(dim_header["name"]))

    for met_header in response["metricHeaders"]:
        columns.append(get_formatted_column_json(met_header["name"]))

    rows = []
    for r in response["rows"]:
        counter = 0
        d = {}
        for item in r["dimensionValues"]:
            column_name = columns[counter]["name"]
            value = item["value"]

            d[column_name] = format_column_value(column_name, value, columns)
            counter = counter + 1

        for item in r["metricValues"]:
            column_name = columns[counter]["name"]
            value = item["value"]

            d[column_name] = format_column_value(column_name, value, columns)
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
                "propertyId": {"type": "number", "title": "Property Id"},
                "jsonKeyFile": {"type": "string", "title": "JSON Key File (ADC is used if omitted)"},
            },
            "required": ["propertyId"],
            "secret": ["jsonKeyFile"],
        }

    def _get_access_token(self):
        scopes = ["https://www.googleapis.com/auth/analytics.readonly"]

        try:
            key = json_loads(b64decode(self.configuration["jsonKeyFile"]))
            creds = Credentials.from_service_account_info(key, scopes=scopes)
        except KeyError:
            creds = google.auth.default(scopes=scopes)[0]

        creds.refresh(google.auth.transport.requests.Request())

        return creds.token

    def run_query(self, query, user):
        access_token = self._get_access_token()
        params = json_loads(query)

        property_id = self.configuration["propertyId"]

        headers = {"Content-Type": "application/json", "Authorization": f"Bearer {access_token}"}

        url = ga_report_endpoint.replace("{propertyId}", str(property_id))
        r = requests.post(url, json=params, headers=headers)
        r.raise_for_status()

        raw_result = r.json()

        data = parse_ga_response(raw_result)

        error = None

        return data, error

    def test_connection(self):
        try:
            access_token = self._get_access_token()
            property_id = self.configuration["propertyId"]

            url = ga_metadata_endpoint.replace("{propertyId}", str(property_id))

            headers = {"Content-Type": "application/json", "Authorization": f"Bearer {access_token}"}

            r = requests.get(url, headers=headers)
            r.raise_for_status()
        except Exception as e:
            raise Exception(e)


register(GoogleAnalytics4)
