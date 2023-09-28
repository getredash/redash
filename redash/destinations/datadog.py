import logging
import os

import requests

from redash.destinations import BaseDestination, register
from redash.utils import json_dumps


class Datadog(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "api_key": {"type": "string", "title": "API Key"},
                "tags": {"type": "string", "title": "Tags"},
                "priority": {"type": "string", "default": "normal", "title": "Priority"},
                # https://docs.datadoghq.com/integrations/faq/list-of-api-source-attribute-value/
                "source_type_name": {"type": "string", "default": "my_apps", "title": "Source Type Name"},
            },
            "secret": ["api_key"],
            "required": ["api_key"],
        }

    @classmethod
    def icon(cls):
        return "fa-datadog"

    def notify(self, alert, query, user, new_state, app, host, metadata, options):
        # Documentation: https://docs.datadoghq.com/api/latest/events/#post-an-event
        if new_state == "triggered":
            alert_type = "error"
            if alert.custom_subject:
                title = alert.custom_subject
            else:
                title = f"{alert.name} just triggered"
        else:
            alert_type = "success"
            if alert.custom_subject:
                title = alert.custom_subject
            else:
                title = f"{alert.name} went back to normal"

        if alert.custom_body:
            text = alert.custom_body
        else:
            text = f"{alert.name} changed state to {new_state}."

        query_url = f"{host}/queries/{query.id}"
        alert_url = f"{host}/alerts/{alert.id}"
        text += f"\nQuery: {query_url}\nAlert: {alert_url}"

        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "DD-API-KEY": options.get("api_key"),
        }

        body = {
            "title": title,
            "text": text,
            "alert_type": alert_type,
            "priority": options.get("priority"),
            "source_type_name": options.get("source_type_name"),
            "aggregation_key": f"redash:{alert_url}",
            "tags": [],
        }

        tags = options.get("tags")
        if tags:
            body["tags"] = tags.split(",")
        body["tags"].extend(
            [
                "redash",
                f"query_id:{query.id}",
                f"alert_id:{alert.id}",
            ]
        )

        dd_host = os.getenv("DATADOG_HOST", "api.datadoghq.com")
        url = f"https://{dd_host}/api/v1/events"

        try:
            resp = requests.post(url, headers=headers, data=json_dumps(body), timeout=5.0)
            logging.warning(resp.text)
            if resp.status_code != 202:
                logging.error(f"Datadog send ERROR. status_code => {resp.status_code}")
        except Exception as e:
            logging.exception("Datadog send ERROR: %s", e)


register(Datadog)
