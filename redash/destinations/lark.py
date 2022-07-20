import logging
import requests

from redash.destinations import *
from redash.utils import json_dumps

logger = logging.getLogger(__name__)


class Lark(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string"},
            },
            "required": ["url"],
            "secret": ["url"],
        }

    @classmethod
    def icon(cls):
        return "lark"

    def notify(self, alert, query, user, new_state, app, host, options):
        alert_op = alert.options

        data = query.latest_query_data.data
        col_name = alert_op["column"]
        if data["rows"] and col_name in data["rows"][0]:
            result_value = data["rows"][0][col_name]
        else:
            result_value = None

        data = {
            "msg_type": "interactive",
            "card": {
                "config": {
                    "wide_screen_mode": True,
                    "enable_forward": True
                },
                "elements": [
                    {
                        "tag": "div",
                        "fields": [
                            {
                                "is_short": True,
                                "text": {
                                    "content": f"Alert:    [{alert.name}]({host}/alerts/{alert.id})",
                                    "tag": "lark_md"
                                }
                            },
                            {
                                "is_short": True,
                                "text": {
                                    "content": f"Query:    [{query.name}]({host}/queries/{query.id})",
                                    "tag": "lark_md"
                                }
                            }
                        ]
                    },
                    {
                        "tag": "div",
                        "text": {
                            "content": f"Detail:    Value  {result_value}  {alert_op['op']}  {alert_op['value']}",
                            "tag": "lark_md"
                        },
                    }
                ],
                "header": {
                    "template": "red",
                    "title": {
                        "content": alert.custom_subject or alert.name,
                        "tag": "plain_text"
                    }
                }
            }
        }

        if alert.custom_body:
            data["card"]["elements"] = alert.custom_body

        try:
            resp = requests.post(
                options.get("url"),
                data=json_dumps(data),
                headers={"Content-Type": "application/json"},
                timeout=5.0,
            )
            if resp.status_code != 200:
                logger.error(
                    "Lark send ERROR. status_code => %s",
                    resp.status_code
                )
        except requests.exceptions.RequestException:
            logger.exception("Lark send ERROR.")


register(Lark)
