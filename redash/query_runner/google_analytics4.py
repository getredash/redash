import logging
from base64 import b64decode
from redash.query_runner import BaseQueryRunner

from redash.query_runner import *
from redash.utils import json_dumps, json_loads
import datetime

logger = logging.getLogger(__name__)

try:
    from google.analytics.data_v1beta import BetaAnalyticsDataClient, GetMetadataRequest
    from google.analytics.data_v1beta.types import DateRange
    from google.analytics.data_v1beta.types import Dimension
    from google.analytics.data_v1beta.types import Metric
    from google.analytics.data_v1beta.types import RunReportRequest

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


def parse_ga_response(response):
    columns = []
    for h in response.dimension_headers:
        data_type = None
        if h.name == "date":
            data_type = "DATE"
        columns.append(
            {
                "name": h.name,
                "friendly_name": h.name,
                "type": types_conv.get(data_type, "string"),
            }
        )

    for h in response.metric_headers:
        data_type = None
        if h.name == "date":
            data_type = "DATE"
        columns.append(
            {
                "name": h.name,
                "friendly_name": h.name,
                "type": types_conv.get(data_type, "string"),
            }
        )

    rows = []
    for r in response.rows:
        counter = 0
        d = {}
        for item in r.dimension_values:
            column_name = columns[counter]["name"]
            column_type = [col for col in columns if col["name"] == column_name][0][
                "type"
            ]
            value = item.value

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


        for item in r.metric_values:
            column_name = columns[counter]["name"]
            column_type = [col for col in columns if col["name"] == column_name][0][
                "type"
            ]
            value = item.value

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
                "jsonKeyFile": {
                    "type": "string",
                    "title": "JSON Key File"
                }
            },
            "required": ["jsonKeyFile"],
            "secret": ["jsonKeyFile"],
        }

    def _get_analytics_client(self):
        key = json_loads(b64decode(self.configuration["jsonKeyFile"]))
        return BetaAnalyticsDataClient.from_service_account_info(key)

    def run_query(self, query, user):
        client = self._get_analytics_client()

        params = json_loads(query)
        propertyId = params.get("propertyId", None)

        dimensions = []
        metrics = []
        date_ranges = []

        for key in params.keys():
            if key == "dimensions":
                for item in params[key]:
                    dimensions.append(Dimension(name=item["name"]))
            elif key == "metrics":
                for item in params[key]:
                    metrics.append(Metric(name=item["name"]))
            elif key == "dateRanges":
                for item in params[key]:
                    date_ranges.append(DateRange(start_date=item["startDate"], end_date=item["endDate"]))

        request = RunReportRequest(
            property=f"properties/{propertyId}",
            dimensions=dimensions,
            metrics=metrics,
            date_ranges=date_ranges,
        )

        response = client.run_report(request)

        data = parse_ga_response(response)

        error = None
        json_data = json_dumps(data)

        return json_data, error

    def test_connection(self):
        try:
            client = self._get_analytics_client()
            request = GetMetadataRequest(
                    name="properties/0/metadata"
                )
            client.get_metadata(request)
        except Exception as e:
            raise Exception(e)


register(GoogleAnalytics4)
