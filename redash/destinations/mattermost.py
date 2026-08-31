import logging

import requests

from redash.destinations import BaseDestination, register
from redash.utils import json_dumps

logger = logging.getLogger(__name__)


class Mattermost(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string", "title": "Mattermost Webhook URL"},
                "username": {"type": "string", "title": "Username"},
                "icon_url": {"type": "string", "title": "Icon (URL)"},
                "channel": {"type": "string", "title": "Channel"},
            },
            "secret": "url",
        }

    @classmethod
    def icon(cls):
        return "fa-bolt"

    def notify(self, alert, query, user, new_state, app, host, metadata, options):
        if alert.custom_subject:
            text = alert.custom_subject
        elif new_state == "triggered":
            text = "#### " + alert.name + " just triggered"
        else:
            text = "#### " + alert.name + " went back to normal"
        payload = {"text": text}

        if alert.custom_body:
            payload["attachments"] = [{"fields": [{"title": "Description", "value": alert.custom_body}]}]

        if options.get("username"):
            payload["username"] = options.get("username")
        if options.get("icon_url"):
            payload["icon_url"] = options.get("icon_url")
        if options.get("channel"):
            payload["channel"] = options.get("channel")

        try:
            resp = requests.post(options.get("url"), data=json_dumps(payload), timeout=5.0)
            logger.warning(resp.text)

            if resp.status_code != 200:
                logger.error("Mattermost webhook send ERROR. status_code => {status}".format(status=resp.status_code))
        except Exception:
            logger.exception("Mattermost webhook send ERROR.")


register(Mattermost)
