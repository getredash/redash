import logging

import requests

from redash.destinations import BaseDestination, register
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

    def notify(self, alert, query, user, new_state, app, host, metadata, options):
        # Documentation: https://api.slack.com/docs/attachments
        fields = [
            {
                "title": "Query",
                "type": "mrkdwn",
                "value": "{host}/queries/{query_id}".format(host=host, query_id=query.id),
            },
            {
                "title": "Alert",
                "type": "mrkdwn",
                "value": "{host}/alerts/{alert_id}".format(host=host, alert_id=alert.id),
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

        try:
            resp = requests.post(options.get("url"), data=json_dumps(payload).encode("utf-8"), timeout=5.0)
            logging.warning(resp.text)
            if resp.status_code != 200:
                logging.error("Slack send ERROR. status_code => {status}".format(status=resp.status_code))
        except Exception:
            logging.exception("Slack send ERROR.")


register(Slack)
