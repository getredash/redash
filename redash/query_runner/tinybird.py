import logging

import requests

from redash.query_runner import register
from redash.query_runner.clickhouse import ClickHouse

logger = logging.getLogger(__name__)


class Tinybird(ClickHouse):
    noop_query = "SELECT count() FROM tinybird.pipe_stats LIMIT 1"

    DEFAULT_URL = "https://api.tinybird.co"

    SQL_ENDPOINT = "/v0/sql"
    DATASOURCES_ENDPOINT = "/v0/datasources"
    PIPES_ENDPOINT = "/v0/pipes"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string", "default": cls.DEFAULT_URL},
                "token": {"type": "string", "title": "Auth Token"},
                "timeout": {
                    "type": "number",
                    "title": "Request Timeout",
                    "default": 30,
                },
                "verify": {
                    "type": "boolean",
                    "title": "Verify SSL certificate",
                    "default": True,
                },
            },
            "order": ["url", "token"],
            "required": ["token"],
            "extra_options": ["timeout", "verify"],
            "secret": ["token"],
        }

    def _get_tables(self, schema):
        self._collect_tinybird_schema(
            schema,
            self.DATASOURCES_ENDPOINT,
            "datasources",
        )

        self._collect_tinybird_schema(
            schema,
            self.PIPES_ENDPOINT,
            "pipes",
        )

        return list(schema.values())

    def _send_query(self, data, session_id=None, session_check=None):
        return self._get_from_tinybird(
            self.SQL_ENDPOINT,
            params={"q": data.encode("utf-8", "ignore")},
        )

    def _collect_tinybird_schema(self, schema, endpoint, resource_type):
        response = self._get_from_tinybird(endpoint)
        resources = response.get(resource_type, [])

        for r in resources:
            if r["name"] not in schema:
                schema[r["name"]] = {"name": r["name"], "columns": []}

            if resource_type == "pipes" and not r.get("endpoint"):
                continue

            query = f"SELECT * FROM {r['name']} LIMIT 1 FORMAT JSON"
            try:
                query_result = self._send_query(query)
            except Exception:
                logger.exception(f"error in schema {r['name']}")
                continue

            columns = [meta["name"] for meta in query_result["meta"]]
            schema[r["name"]]["columns"].extend(columns)

        return schema

    def _get_from_tinybird(self, endpoint, params=None):
        url = f"{self.configuration.get('url', self.DEFAULT_URL)}{endpoint}"
        authorization = f"Bearer {self.configuration.get('token')}"

        try:
            response = requests.get(
                url,
                timeout=self.configuration.get("timeout", 30),
                params=params,
                headers={"Authorization": authorization},
                verify=self.configuration.get("verify", True),
            )
        except requests.RequestException as e:
            if e.response:
                details = f"({e.__class__.__name__}, Status Code: {e.response.status_code})"
            else:
                details = f"({e.__class__.__name__})"
            raise Exception(f"Connection error to: {url} {details}.")

        if response.status_code >= 400:
            raise Exception(response.text)

        return response.json()


register(Tinybird)
