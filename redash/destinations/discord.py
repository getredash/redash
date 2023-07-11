import logging

import requests

from redash.destinations import BaseDestination, register
from redash.utils import json_dumps

RED_ALERT_COLOR = "12597547"

GREEN_ALERT_COLOR = "2600544"


class Discord(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string", "title": "Discord Webhook URL"}
            },
            "secret": ["url"],
            "required": ["url"],
        }

    @classmethod
    def icon(cls):
        return "fa-discord"

    def notify(self, alert, query, user, app, host, options):
        # Documentation: https://birdie0.github.io/discord-webhooks-guide/discord_webhook.html
        fields = [
            {
                "name": "Query",
                "value": "{host}/queries/{query_id}".format(
                    host=host, query_id=query.id
                ),
                "inline": True,
            },
            {
                "name": "Alert",
                "value": "{host}/alerts/{alert_id}".format(
                    host=host, alert_id=alert.id
                ),
                "inline": True,
            },
        ]
        if alert.options.get("custom_body"):
            fields.append({"name": "Description", "value": alert.options["custom_body"]})
        if alert.TRIGGERED_STATE == "triggered":
            if alert.options.get("custom_subject"):
                text = alert.options["custom_subject"]
            else:
                text = f"{alert.name} just triggered"
            color = RED_ALERT_COLOR
        else:
            text = f"{alert.name} went back to normal"
            color = GREEN_ALERT_COLOR

        payload = {"content": text, "embeds": [{"color": color, "fields": fields}]}
        headers = {"Content-Type": "application/json"}
        try:
            resp = requests.post(
                options.get("url"),
                data=json_dumps(payload),
                headers=headers,
                timeout=5.0,
            )
            if resp.status_code != 200 and resp.status_code != 204:
                logging.error(
                    "webhook send ERROR. status_code => {status}".format(
                        status=resp.status_code
                    )
                )
        except Exception as e:
            logging.exception("webhook send ERROR: %s", e)


register(Discord)
