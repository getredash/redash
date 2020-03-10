import os
import logging
import requests
from requests.auth import HTTPBasicAuth

from redash import settings
from redash.query_runner import *
from redash.utils import json_dumps

logger = logging.getLogger(__name__)

types_map = {
    "tinyint": TYPE_INTEGER,
    "smallint": TYPE_INTEGER,
    "integer": TYPE_INTEGER,
    "bigint": TYPE_INTEGER,
    "int4": TYPE_INTEGER,
    "long8": TYPE_INTEGER,
    "int": TYPE_INTEGER,
    "short": TYPE_INTEGER,
    "long": TYPE_INTEGER,
    "byte": TYPE_INTEGER,
    "hllc10": TYPE_INTEGER,
    "hllc12": TYPE_INTEGER,
    "hllc14": TYPE_INTEGER,
    "hllc15": TYPE_INTEGER,
    "hllc16": TYPE_INTEGER,
    "hllc(10)": TYPE_INTEGER,
    "hllc(12)": TYPE_INTEGER,
    "hllc(14)": TYPE_INTEGER,
    "hllc(15)": TYPE_INTEGER,
    "hllc(16)": TYPE_INTEGER,
    "float": TYPE_FLOAT,
    "double": TYPE_FLOAT,
    "decimal": TYPE_FLOAT,
    "real": TYPE_FLOAT,
    "numeric": TYPE_FLOAT,
    "boolean": TYPE_BOOLEAN,
    "bool": TYPE_BOOLEAN,
    "date": TYPE_DATE,
    "datetime": TYPE_DATETIME,
    "timestamp": TYPE_DATETIME,
    "time": TYPE_DATETIME,
    "varchar": TYPE_STRING,
    "char": TYPE_STRING,
    "string": TYPE_STRING,
}


class Kylin(BaseQueryRunner):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "user": {"type": "string", "title": "Kylin Username"},
                "password": {"type": "string", "title": "Kylin Password"},
                "url": {
                    "type": "string",
                    "title": "Kylin API URL",
                    "default": "http://kylin.example.com/kylin/",
                },
                "project": {"type": "string", "title": "Kylin Project"},
            },
            "order": ["url", "project", "user", "password"],
            "required": ["url", "project", "user", "password"],
            "secret": ["password"],
        }

    def run_query(self, query, user):
        url = self.configuration["url"]
        kylinuser = self.configuration["user"]
        kylinpass = self.configuration["password"]
        kylinproject = self.configuration["project"]

        resp = requests.post(
            os.path.join(url, "api/query"),
            auth=HTTPBasicAuth(kylinuser, kylinpass),
            json={
                "sql": query,
                "offset": settings.KYLIN_OFFSET,
                "limit": settings.KYLIN_LIMIT,
                "acceptPartial": settings.KYLIN_ACCEPT_PARTIAL,
                "project": kylinproject,
            },
        )

        if not resp.ok:
            return {}, resp.text or str(resp.reason)

        data = resp.json()
        columns = self.get_columns(data["columnMetas"])
        rows = self.get_rows(columns, data["results"])

        return json_dumps({"columns": columns, "rows": rows}), None

    def get_schema(self, get_stats=False):
        url = self.configuration["url"]
        kylinuser = self.configuration["user"]
        kylinpass = self.configuration["password"]
        kylinproject = self.configuration["project"]

        resp = requests.get(
            os.path.join(url, "api/tables_and_columns"),
            params={"project": kylinproject},
            auth=HTTPBasicAuth(kylinuser, kylinpass),
        )

        resp.raise_for_status()

        data = resp.json()
        return [self.get_table_schema(table) for table in data]

    def test_connection(self):
        url = self.configuration["url"]
        requests.get(url).raise_for_status()

    def get_columns(self, colmetas):
        return self.fetch_columns(
            [
                (
                    meta["name"],
                    types_map.get(meta["columnTypeName"].lower(), TYPE_STRING),
                )
                for meta in colmetas
            ]
        )

    def get_rows(self, columns, results):
        return [
            dict(zip((column["name"] for column in columns), row)) for row in results
        ]

    def get_table_schema(self, table):
        name = table["table_NAME"]
        columns = [col["column_NAME"].lower() for col in table["columns"]]
        return {"name": name, "columns": columns}


register(Kylin)
