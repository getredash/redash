import logging
from copy import deepcopy

import requests

from redash.destinations import BaseDestination, register
from redash.models import Alert


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
            },
            "secret": ["webex_bot_token"],
            "required": ["webex_bot_token"],
        }

    @classmethod
    def icon(cls):
        return "fa-webex"

    @property
    def api_base_url(self):
        return "https://webexapis.com/v1/messages"

    @staticmethod
    def formatted_attachments_template(subject, description, query_link, alert_link):
        return [
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
                                            "text": {subject},
                                            "weight": "bolder",
                                            "size": "medium",
                                            "wrap": True,
                                        },
                                        {
                                            "type": "TextBlock",
                                            "text": {description},
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
                            ],
                        }
                    ],
                },
            }
        ]

    def notify(self, alert, query, user, new_state, app, host, metadata, options):
        # Documentation: https://developer.webex.com/docs/api/guides/cards

        query_link = f"{host}/queries/{query.id}"
        alert_link = f"{host}/alerts/{alert.id}"

        if new_state == Alert.TRIGGERED_STATE:
            subject = alert.custom_subject or f"{alert.name} just triggered"
        else:
            subject = f"{alert.name} went back to normal"

        attachments = self.formatted_attachments_template(
            subject=subject, description=alert.custom_body, query_link=query_link, alert_link=alert_link
        )

        template_payload = {"markdown": subject + "\n" + alert.custom_body, "attachments": attachments}

        headers = {"Authorization": f"Bearer {options['webex_bot_token']}"}

        api_destinations = {
            "toPersonEmail": options.get("to_person_emails"),
            "roomId": options.get("to_room_ids"),
        }

        for payload_tag, destinations in api_destinations.items():
            if destinations is None:
                continue

            # destinations is guaranteed to be a comma-separated string
            for destination_id in destinations.split(","):
                payload = deepcopy(template_payload)
                payload[payload_tag] = destination_id
                self.post_message(payload, headers)

    def post_message(self, payload, headers):
        try:
            resp = requests.post(
                self.api_base_url,
                json=payload,
                headers=headers,
                timeout=5.0,
            )
            logging.warning(resp.text)
            if resp.status_code != 200:
                logging.error("Webex send ERROR. status_code => {status}".format(status=resp.status_code))
        except Exception as e:
            logging.exception(f"Webex send ERROR: {e}")


register(Webex)
