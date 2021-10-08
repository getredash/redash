import logging
import yaml
from urllib.parse import parse_qs, urlparse

import requests

from redash.query_runner import *
from redash.utils import json_dumps

logger = logging.getLogger(__name__)

COLUMN_TYPES = {
    "date": (
        "firstVisitDate",
        "firstVisitStartOfYear",
        "firstVisitStartOfQuarter",
        "firstVisitStartOfMonth",
        "firstVisitStartOfWeek",
    ),
    "datetime": (
        "firstVisitStartOfHour",
        "firstVisitStartOfDekaminute",
        "firstVisitStartOfMinute",
        "firstVisitDateTime",
        "firstVisitHour",
        "firstVisitHourMinute",
    ),
    "int": (
        "pageViewsInterval",
        "pageViews",
        "firstVisitYear",
        "firstVisitMonth",
        "firstVisitDayOfMonth",
        "firstVisitDayOfWeek",
        "firstVisitMinute",
        "firstVisitDekaminute",
    ),
}

for type_, elements in COLUMN_TYPES.items():
    for el in elements:
        if "first" in el:
            el = el.replace("first", "last")
            COLUMN_TYPES[type_] += (el,)


def parse_ym_response(response):
    columns = []
    dimensions_len = len(response["query"]["dimensions"])

    for h in response["query"]["dimensions"] + response["query"]["metrics"]:
        friendly_name = h.split(":")[-1]
        if friendly_name in COLUMN_TYPES["date"]:
            data_type = TYPE_DATE
        elif friendly_name in COLUMN_TYPES["datetime"]:
            data_type = TYPE_DATETIME
        else:
            data_type = TYPE_STRING
        columns.append({"name": h, "friendly_name": friendly_name, "type": data_type})

    rows = []
    for num, row in enumerate(response["data"]):
        res = {}
        for i, d in enumerate(row["dimensions"]):
            res[columns[i]["name"]] = d["name"]
        for i, d in enumerate(row["metrics"]):
            res[columns[dimensions_len + i]["name"]] = d
            if num == 0 and isinstance(d, float):
                columns[dimensions_len + i]["type"] = TYPE_FLOAT
        rows.append(res)

    return {"columns": columns, "rows": rows}


class YandexMetrica(BaseSQLQueryRunner):
    should_annotate_query = False

    @classmethod
    def type(cls):
        # This is written with a "k" for backward-compatibility. See #2874.
        return "yandex_metrika"

    @classmethod
    def name(cls):
        return "Yandex Metrica"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {"token": {"type": "string", "title": "OAuth Token"}},
            "secret": ["token"],
            "required": ["token"],
        }

    def __init__(self, configuration):
        super(YandexMetrica, self).__init__(configuration)
        self.syntax = "yaml"
        self.url = "https://api-metrica.yandex.com"
        self.list_path = "counters"

    def _get_tables(self, schema):

        counters = self._send_query("management/v1/{0}".format(self.list_path))

        for row in counters[self.list_path]:
            owner = row.get("owner_login")
            counter = "{0} | {1}".format(
                row.get("name", "Unknown"), row.get("id", "Unknown")
            )
            if owner not in schema:
                schema[owner] = {"name": owner, "columns": []}

            schema[owner]["columns"].append(counter)

        return list(schema.values())

    def test_connection(self):
        self._send_query("management/v1/{0}".format(self.list_path))

    def _send_query(self, path="stat/v1/data", **kwargs):
        token = kwargs.pop("oauth_token", self.configuration["token"])
        r = requests.get(
            "{0}/{1}".format(self.url, path),
            headers={"Authorization": "OAuth {}".format(token)},
            params=kwargs,
        )
        if r.status_code != 200:
            raise Exception(r.text)
        return r.json()

    def run_query(self, query, user):
        logger.debug("Metrica is about to execute query: %s", query)
        data = None
        query = query.strip()
        if query == "":
            error = "Query is empty"
            return data, error
        try:
            params = yaml.safe_load(query)
        except ValueError as e:
            logging.exception(e)
            error = str(e)
            return data, error

        if isinstance(params, dict):
            if "url" in params:
                params = parse_qs(urlparse(params["url"]).query, keep_blank_values=True)
        else:
            error = "The query format must be JSON or YAML"
            return data, error

        try:
            data = json_dumps(parse_ym_response(self._send_query(**params)))
            error = None
        except Exception as e:
            logging.exception(e)
            error = str(e)
        return data, error


class YandexAppMetrica(YandexMetrica):
    @classmethod
    def type(cls):
        # This is written with a "k" for backward-compatibility. See #2874.
        return "yandex_appmetrika"

    @classmethod
    def name(cls):
        return "Yandex AppMetrica"

    def __init__(self, configuration):
        super(YandexAppMetrica, self).__init__(configuration)
        self.url = "https://api.appmetrica.yandex.com"
        self.list_path = "applications"


register(YandexMetrica)
register(YandexAppMetrica)
