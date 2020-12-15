import logging
import requests

from redash.destinations import *
from redash.utils import json_dumps


class HangoutsChat(BaseDestination):
    @classmethod
    def name(cls):
        return "Google Hangouts Chat"

    @classmethod
    def type(cls):
        return "hangouts_chat"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "title": "Webhook URL (get it from the room settings)",
                },
                "icon_url": {
                    "type": "string",
                    "title": "Icon URL (32x32 or multiple, png format)",
                },
            },
            "secret": ["url"],
            "required": ["url"],
        }

    @classmethod
    def icon(cls):
        return "fa-bolt"

    def notify(self, alert, query, user, new_state, app, host, options):
        try:
            if new_state == "triggered":
                message = '<b><font color="#c0392b">Triggered</font></b>'
            elif new_state == "ok":
                message = '<font color="#27ae60">Went back to normal</font>'
            else:
                message = (
                    "Unable to determine status. Check Query and Alert configuration."
                )

            if alert.custom_subject:
                title = alert.custom_subject
            else:
                title = alert.name

            data = {
                "cards": [
                    {
                        "header": {"title": title},
                        "sections": [
                            {"widgets": [{"textParagraph": {"text": message}}]}
                        ],
                    }
                ]
            }

            if alert.custom_body:
                data["cards"][0]["sections"].append(
                    {"widgets": [{"textParagraph": {"text": alert.custom_body}}]}
                )

            if options.get("icon_url"):
                data["cards"][0]["header"]["imageUrl"] = options.get("icon_url")

            # Hangouts Chat will create a blank card if an invalid URL (no hostname) is posted.
            if host:
                data["cards"][0]["sections"][0]["widgets"].append(
                    {
                        "buttons": [
                            {
                                "textButton": {
                                    "text": "OPEN QUERY",
                                    "onClick": {
                                        "openLink": {
                                            "url": "{host}/queries/{query_id}".format(
                                                host=host, query_id=query.id
                                            )
                                        }
                                    },
                                }
                            }
                        ]
                    }
                )

            headers = {"Content-Type": "application/json; charset=UTF-8"}
            resp = requests.post(
                options.get("url"), data=json_dumps(data), headers=headers, timeout=5.0
            )
            if resp.status_code != 200:
                logging.error(
                    "webhook send ERROR. status_code => {status}".format(
                        status=resp.status_code
                    )
                )
        except Exception:
            logging.exception("webhook send ERROR.")


register(HangoutsChat)
