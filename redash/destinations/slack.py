import logging
import requests

from redash.destinations import *
from redash.utils import json_dumps


class Slack(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string", "title": "Slack Webhook URL"},
                "username": {"type": "string", "title": "Username"},
                "icon_emoji": {"type": "string", "title": "Icon (Emoji)"},
                "icon_url": {"type": "string", "title": "Icon (URL)"},
                "channel": {"type": "string", "title": "Channel"},
            },
        }

    @classmethod
    def icon(cls):
        return "fa-slack"

    def notify(self, alert, query, user, new_state, app, host, options):
        # Documentation: https://api.slack.com/docs/attachments
        fields = [
            {
                "title": "Query",
                "value": "{host}/queries/{query_id}".format(
                    host=host, query_id=query.id
                ),
                "short": True,
            },
            {
                "title": "Alert",
                "value": "{host}/alerts/{alert_id}".format(
                    host=host, alert_id=alert.id
                ),
                "short": True,
            },
        ]
        if alert.custom_body:
            fields.append({"title": "Description", "value": alert.custom_body})
        if new_state == "triggered":
            if alert.custom_subject:
                text = alert.custom_subject
            else:
                text = alert.name + " just triggered"
            color = "#c0392b"
        else:
            text = alert.name + " went back to normal"
            color = "#27ae60"

        payload = {"attachments": [{"text": text, "color": color, "fields": fields}]}

        if options.get("username"):
            payload["username"] = options.get("username")
        if options.get("icon_emoji"):
            payload["icon_emoji"] = options.get("icon_emoji")
        if options.get("icon_url"):
            payload["icon_url"] = options.get("icon_url")
        if options.get("channel"):
            payload["channel"] = options.get("channel")

        try:
            resp = requests.post(
                options.get("url"), data=json_dumps(payload), timeout=5.0
            )
            logging.warning(resp.text)
            if resp.status_code != 200:
                logging.error(
                    "Slack send ERROR. status_code => {status}".format(
                        status=resp.status_code
                    )
                )
        except Exception:
            logging.exception("Slack send ERROR.")


register(Slack)
