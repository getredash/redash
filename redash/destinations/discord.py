import logging

import requests

from redash.destinations import BaseDestination, register
from redash.models import Alert
from redash.utils import json_dumps

colors = {
    # Colors are in a Decimal format as Discord requires them to be Decimals for embeds
    Alert.OK_STATE: "2600544",  # Green Decimal Code
    Alert.TRIGGERED_STATE: "12597547",  # Red Decimal Code
    Alert.UNKNOWN_STATE: "16776960",  # Yellow Decimal Code
}


class Discord(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {"url": {"type": "string", "title": "Discord Webhook URL"}},
            "secret": ["url"],
            "required": ["url"],
        }

    @classmethod
    def icon(cls):
        return "fa-discord"

    def notify(self, alert, query, user, new_state, app, host, metadata, options):
        # Documentation: https://birdie0.github.io/discord-webhooks-guide/discord_webhook.html
        fields = [
            {
                "name": "Query",
                "value": f"{host}/queries/{query.id}",
                "inline": True,
            },
            {
                "name": "Alert",
                "value": f"{host}/alerts/{alert.id}",
                "inline": True,
            },
        ]
        if alert.custom_body:
            fields.append({"name": "Description", "value": alert.custom_body})
        if new_state == Alert.TRIGGERED_STATE:
            if alert.options.get("custom_subject"):
                text = alert.options["custom_subject"]
            else:
                text = f"{alert.name} just triggered"
        else:
            text = f"{alert.name} went back to normal"
        color = colors.get(new_state)
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
                logging.error(f"Discord send ERROR. status_code => {resp.status_code}")
        except Exception as e:
            logging.exception("Discord send ERROR: %s", e)


register(Discord)
