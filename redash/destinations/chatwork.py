import logging
import requests

from redash.destinations import *


class ChatWork(BaseDestination):
    ALERTS_DEFAULT_MESSAGE_TEMPLATE = (
        "{alert_name} changed state to {new_state}.\\n{alert_url}\\n{query_url}"
    )

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "api_token": {"type": "string", "title": "API Token"},
                "room_id": {"type": "string", "title": "Room ID"},
                "message_template": {
                    "type": "string",
                    "default": ChatWork.ALERTS_DEFAULT_MESSAGE_TEMPLATE,
                    "title": "Message Template",
                },
            },
            "secret": ["api_token"],
            "required": ["message_template", "api_token", "room_id"],
        }

    @classmethod
    def icon(cls):
        return "fa-comment"

    def notify(self, alert, query, user, new_state, app, host, options):
        try:
            # Documentation: http://developer.chatwork.com/ja/endpoint_rooms.html#POST-rooms-room_id-messages
            url = "https://api.chatwork.com/v2/rooms/{room_id}/messages".format(
                room_id=options.get("room_id")
            )

            message = ""
            if alert.custom_subject:
                message = alert.custom_subject + "\n"
            if alert.custom_body:
                message += alert.custom_body
            else:
                alert_url = "{host}/alerts/{alert_id}".format(
                    host=host, alert_id=alert.id
                )
                query_url = "{host}/queries/{query_id}".format(
                    host=host, query_id=query.id
                )
                message_template = options.get(
                    "message_template", ChatWork.ALERTS_DEFAULT_MESSAGE_TEMPLATE
                )
                message += message_template.replace("\\n", "\n").format(
                    alert_name=alert.name,
                    new_state=new_state.upper(),
                    alert_url=alert_url,
                    query_url=query_url,
                )

            headers = {"X-ChatWorkToken": options.get("api_token")}
            payload = {"body": message}

            resp = requests.post(url, headers=headers, data=payload, timeout=5.0)
            logging.warning(resp.text)
            if resp.status_code != 200:
                logging.error(
                    "ChatWork send ERROR. status_code => {status}".format(
                        status=resp.status_code
                    )
                )
        except Exception:
            logging.exception("ChatWork send ERROR.")


register(ChatWork)
