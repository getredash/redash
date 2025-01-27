import html
import json
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
        # Attempt to parse the description to find a 2D array
        try:
            # Extract the part of the description that looks like a JSON array
            start_index = description.find("[")
            end_index = description.rfind("]") + 1
            json_array_str = description[start_index:end_index]

            # Decode HTML entities
            json_array_str = html.unescape(json_array_str)

            # Replace single quotes with double quotes for valid JSON
            json_array_str = json_array_str.replace("'", '"')

            # Load the JSON array
            data_array = json.loads(json_array_str)

            # Check if it's a 2D array
            if isinstance(data_array, list) and all(isinstance(i, list) for i in data_array):
                # Create a table for the Adaptive Card
                table_rows = []
                for row in data_array:
                    table_rows.append(
                        {
                            "type": "ColumnSet",
                            "columns": [
                                {"type": "Column", "items": [{"type": "TextBlock", "text": str(item), "wrap": True}]}
                                for item in row
                            ],
                        }
                    )

                # Create the body of the card with the table
                body = (
                    [
                        {
                            "type": "TextBlock",
                            "text": f"{subject}",
                            "weight": "bolder",
                            "size": "medium",
                            "wrap": True,
                        },
                        {
                            "type": "TextBlock",
                            "text": f"{description[:start_index]}",
                            "isSubtle": True,
                            "wrap": True,
                        },
                    ]
                    + table_rows
                    + [
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
                    ]
                )
            else:
                # Fallback to the original description if no valid 2D array is found
                body = [
                    {
                        "type": "TextBlock",
                        "text": f"{subject}",
                        "weight": "bolder",
                        "size": "medium",
                        "wrap": True,
                    },
                    {
                        "type": "TextBlock",
                        "text": f"{description}",
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
                ]
        except json.JSONDecodeError:
            # If parsing fails, fallback to the original description
            body = [
                {
                    "type": "TextBlock",
                    "text": f"{subject}",
                    "weight": "bolder",
                    "size": "medium",
                    "wrap": True,
                },
                {
                    "type": "TextBlock",
                    "text": f"{description}",
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
            ]

        return [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.0",
                    "body": body,
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
                destination_id = destination_id.strip()  # Remove any leading or trailing whitespace
                if not destination_id:  # Check if the destination_id is empty or blank
                    continue  # Skip to the next iteration if it's empty or blank

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
