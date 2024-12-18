import logging
from base64 import b64decode
from datetime import datetime

from redash.query_runner import (
    TYPE_DATE,
    TYPE_DATETIME,
    TYPE_FLOAT,
    TYPE_INTEGER,
    TYPE_STRING,
    BaseSQLQueryRunner,
    register,
)
from redash.utils import json_loads

logger = logging.getLogger(__name__)

try:
    import google.auth
    from apiclient.discovery import build
    from apiclient.errors import HttpError
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


def parse_ga_response(response, dimensions):
    columns = []

    for item in dimensions:
        if item == "date":
            data_type = "date"
        else:
            data_type = "string"
        columns.append(
            {
                "name": item,
                "friendly_name": item,
                "type": data_type,
            }
        )

    default_items = ["clicks", "impressions", "ctr", "position"]
    for item in default_items:
        columns.append({"name": item, "friendly_name": item, "type": "number"})

    rows = []
    for r in response.get("rows", []):
        d = {}
        for k, value in r.items():
            if k == "keys":
                for index, val in enumerate(value):
                    column_name = columns[index]["name"]
                    column_type = columns[index]["type"]
                    val = get_formatted_value(column_type, val)
                    d[column_name] = val
            else:
                column_name = k
                column_type = [col for col in columns if col["name"] == column_name][0]["type"]
                value = get_formatted_value(column_type, value)
                d[column_name] = value
        rows.append(d)

    return {"columns": columns, "rows": rows}


def get_formatted_value(column_type, value):
    if column_type == "number":
        value = round(value, 2)
    elif column_type == TYPE_DATE:
        value = datetime.strptime(value, "%Y-%m-%d")
    elif column_type == TYPE_DATETIME:
        if len(value) == 10:
            value = datetime.strptime(value, "%Y%m%d%H")
        elif len(value) == 12:
            value = datetime.strptime(value, "%Y%m%d%H%M")
        else:
            raise Exception("Unknown date/time format in results: '{}'".format(value))
    return value


class GoogleSearchConsole(BaseSQLQueryRunner):
    should_annotate_query = False

    @classmethod
    def type(cls):
        return "google_search_console"

    @classmethod
    def name(cls):
        return "Google Search Console"

    @classmethod
    def enabled(cls):
        return enabled

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "siteURL": {"type": "string", "title": "Site URL"},
                "jsonKeyFile": {"type": "string", "title": "JSON Key File (ADC is used if omitted)"},
            },
            "required": [],
            "secret": ["jsonKeyFile"],
        }

    def __init__(self, configuration):
        super(GoogleSearchConsole, self).__init__(configuration)
        self.syntax = "json"

    def _get_search_service(self):
        scopes = ["https://www.googleapis.com/auth/webmasters.readonly"]

        try:
            key = json_loads(b64decode(self.configuration["jsonKeyFile"]))
            creds = Credentials.from_service_account_info(key, scopes=scopes)
        except KeyError:
            creds = google.auth.default(scopes=scopes)[0]

        return build("searchconsole", "v1", credentials=creds)

    def test_connection(self):
        try:
            service = self._get_search_service()
            service.sites().list().execute()
        except HttpError as e:
            # Make sure we return a more readable error to the end user
            raise Exception(e._get_reason())

    def run_query(self, query, user):
        logger.debug("Search Analytics is about to execute query: %s", query)
        params = json_loads(query)
        site_url = self.configuration["siteURL"]
        api = self._get_search_service()

        if len(params) > 0:
            try:
                response = api.searchanalytics().query(siteUrl=site_url, body=params).execute()
                data = parse_ga_response(response, params["dimensions"])
                error = None
            except HttpError as e:
                # Make sure we return a more readable error to the end user
                error = e._get_reason()
                data = None
        else:
            error = "Wrong query format."
            data = None
        return data, error


register(GoogleSearchConsole)
