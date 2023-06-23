import logging

import requests

from redash.destinations import *
from redash.utils import json_dumps


class Discord(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string", "title": "Discord Webhook URL"}
            },
            "secret": ["url"],
        }

    @classmethod
    def icon(cls):
        return "fa-discord"

    def notify(self, alert, query, user, new_state, app, host, options):
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
        if new_state == "triggered":
            if alert.options.get("custom_subject"):
                text = alert.options["custom_subject"]
            else:
                text = alert.name + " just triggered"
            color = "12597547"
        else:
            text = alert.name + " went back to normal"
            color = "2600544"

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
            else:
                logging.info(msg=f"webhook send SUCCESS")
        except Exception as e:
            logging.exception("webhook send ERROR: %s", e)


register(Discord)
