import logging
import requests

from redash.destinations import *


class Webex(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "webex_bot_token": {"type": "string", "title": "Webex Bot Token"},
                "to_person_emails": {
                    "type": "string",
                    "title": "People (comma-separated)",
                },
                "to_room_ids": {
                    "type": "string",
                    "title": "Rooms (comma-separated)",
                },
                "organization": {"type": "string", "title": "Organization"},
            },
            "secret": ["webex_bot_token"],
        }

    @classmethod
    def icon(cls):
        return "fa-webex"

    def notify(self, alert, query, user, new_state, app, host, options):
        # Documentation: https://developer.webex.com/docs/api/guides/cards

        query_link = "{host}/queries/{query_id}".format(host=host, query_id=query.id)
        alert_link = "{host}/alerts/{alert_id}".format(host=host, alert_id=alert.id)
        description = alert.custom_body if alert.custom_body else ""

        if new_state == "triggered":
            if alert.custom_subject:
                subject = alert.custom_subject
            else:
                subject = alert.name + " just triggered"
        else:
            subject = alert.name + " went back to normal"

        attachments = [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.0",
                    "body": [
                        {
                            "type": "ColumnSet",
                            "columns": [
                                {
                                    "type": "Column",
                                    "width": 4,
                                    "items": [
                                        {
                                            "type": "TextBlock",
                                            "text": subject,
                                            "weight": "bolder",
                                            "size": "medium",
                                            "wrap": True,
                                        },
                                        {
                                            "type": "TextBlock",
                                            "text": description,
                                            "isSubtle": True,
                                            "wrap": True,
                                        },
                                        {
                                            "type": "TextBlock",
                                            "text": f"Click [here]({query_link}) to check your query!",
                                            "wrap": True,
                                            "isSubtle": True,
                                        },
                                        {
                                            "type": "TextBlock",
                                            "text": f"Click [here]({alert_link}) to check your alert!",
                                            "wrap": True,
                                            "isSubtle": True,
                                        },
                                    ],
                                },
                                {
                                    "type": "Column",
                                    "width": 1,
                                    "items": [
                                        {
                                            "type": "Image",
                                            "url": "https://cdn.pixabay.com/photo/2016/09/16/09/20/alarm-1673577_960_720.png",
                                            "size": "medium",
                                        }
                                    ],
                                },
                            ],
                        }
                    ],
                },
            }
        ]

        payload = {"markdown": subject + "\n" + description, "attachments": attachments}

        headers = {"Authorization": "Bearer {}".format(options.get("webex_bot_token"))}

        to_person_ids = (
            options.get("to_person_emails").split(",")
            if options.get("to_person_emails")
            else []
        )
        to_room_ids = (
            options.get("to_room_ids").split(",") if options.get("to_room_ids") else []
        )

        for to_person_email in to_person_ids:
            try:
                payload["toPersonEmail"] = to_person_email
                resp = requests.post(
                    "https://webexapis.com/v1/messages",
                    json=payload,
                    headers=headers,
                    timeout=5.0,
                )
                logging.warning(resp.text)
                if resp.status_code != 200:
                    logging.error(
                        "Webex send ERROR. status_code => {status}".format(
                            status=resp.status_code
                        )
                    )
            except Exception:
                logging.exception("Webex send ERROR.")

        for to_room_id in to_room_ids:
            try:
                payload["roomId"] = to_room_id
                resp = requests.post(
                    "https://webexapis.com/v1/messages",
                    json=payload,
                    headers=headers,
                    timeout=5.0,
                )
                logging.warning(resp.text)
                if resp.status_code != 200:
                    logging.error(
                        "Webex send ERROR. status_code => {status}".format(
                            status=resp.status_code
                        )
                    )
            except Exception:
                logging.exception("Webex send ERROR.")


register(Webex)
