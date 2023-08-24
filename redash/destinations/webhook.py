import logging

import requests
from requests.auth import HTTPBasicAuth

from redash.destinations import BaseDestination, register
from redash.serializers import serialize_alert
from redash.utils import json_dumps


class Webhook(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string"},
                "username": {"type": "string"},
                "password": {"type": "string"},
            },
            "required": ["url"],
            "secret": ["password", "url"],
        }

    @classmethod
    def icon(cls):
        return "fa-bolt"

    def notify(self, alert, query, user, new_state, app, host, metadata, options):
        try:
            data = {
                "event": "alert_state_change",
                "alert": serialize_alert(alert, full=False),
                "url_base": host,
                "metadata": metadata,
            }

            data["alert"]["description"] = alert.custom_body
            data["alert"]["title"] = alert.custom_subject

            headers = {"Content-Type": "application/json"}
            auth = HTTPBasicAuth(options.get("username"), options.get("password")) if options.get("username") else None
            resp = requests.post(
                options.get("url"),
                data=json_dumps(data),
                auth=auth,
                headers=headers,
                timeout=5.0,
            )
            if resp.status_code != 200:
                logging.error("webhook send ERROR. status_code => {status}".format(status=resp.status_code))
        except Exception:
            logging.exception("webhook send ERROR.")


register(Webhook)
