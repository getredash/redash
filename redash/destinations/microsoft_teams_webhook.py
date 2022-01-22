import logging
import requests

from redash.destinations import *
from redash.utils import json_dumps
from redash.serializers import serialize_alert


class MicrosoftTeamsWebhook(BaseDestination):
    @classmethod
    def name(cls):
        return "Microsoft Teams Webhook"

    @classmethod
    def type(cls):
        return "microsoft_teams_webhook"

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string"},
            },
            "required": ["url"],
        }

    @classmethod
    def icon(cls):
        return "fa-bolt"

    def notify(self, alert, query, user, new_state, app, host, options):
        """
        :type app: redash.Redash
        """
        try:
            data = {
                "@type": "MessageCard",
                "@context": "http://schema.org/extensions",
                "themeColor": "0076D7",
                "summary": "A Redash Alert was Triggered",
                "sections": [{
                    "activityTitle": "A Redash Alert was Triggered",
                    "facts": [{
                        "name": "Alert Name",
                        "value": alert.name
                    }, {
                        "name": "Alert Author",
                        "value": user.name
                    }, {
                        "name": "Query",
                        "value": query.query_text
                    }, {
                        "name": "Query URL",
                        "value": "%s/queries/%s" % (host, query.id)
                    }],
                    "markdown": True
                }]
            }

            headers = {"Content-Type": "application/json"}

            resp = requests.post(
                options.get("url"),
                data=json_dumps(data),
                headers=headers,
                timeout=5.0,
            )
            if resp.status_code != 200:
                logging.error(
                    "MS Teams Webhook send ERROR. status_code => {status}".format(
                        status=resp.status_code
                    )
                )
        except Exception:
            logging.exception("MS Teams Webhook send ERROR.")


register(MicrosoftTeamsWebhook)
