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
            },
            "secret": ["url"],
        }

    @classmethod
    def icon(cls):
        return "fa-slack"

    def notify(self, alert, query, user, new_state, app, host, options):
        # Documentation: https://api.slack.com/reference/block-kit/blocks
        header_text = alert.custom_subject if alert.custom_subject else alert.name
        if new_state == "triggered":
            header_text = f":red_circle: *Triggered: {header_text}*"
        else:
            header_text = f":green: *Recovered: {header_text}*"

        if not host:
            # HACK: Not sure why 'host' is empty.
            host = "https://redash.scale.com"

        blocks = [
            {
                "type": "section",
                "text": {"text": header_text, "type": "mrkdwn"},
                "fields": [
                    {"type": "mrkdwn", "text": "*Query*"},
                    {"type": "mrkdwn", "text": "*Alert*"},
                    {
                        "type": "mrkdwn",
                        "text": f"<{host}/queries/{query.id}|{query.id}>",
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"<{host}/alerts/{alert.id}|{alert.id}>",
                    },
                ],
            },
        ]
        if alert.custom_body:
            blocks.append(
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": f"*Description*\n{alert.custom_body}",
                    },
                }
            )

        payload = {
            "blocks": blocks,
        }

        try:
            resp = requests.post(options.get("url"), data=json_dumps(payload), timeout=5.0)
            logging.warning(resp.text)
            if resp.status_code != 200:
                logging.error(
                    "Slack send ERROR. status_code => {status}".format(status=resp.status_code)
                )
        except Exception:
            logging.exception("Slack send ERROR.")


register(Slack)
