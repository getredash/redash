import json
import logging
import requests

from redash.destinations import *


class Slack(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'url': {
                    'type': 'string',
                    'title': 'Slack Webhook URL'
                }
            }
        }

    @classmethod
    def icon(cls):
        return 'fa-slack'

    def notify(self, alert, query, user, new_state, app, host, options):
        # Documentation: https://api.slack.com/docs/attachments
        fields = [
            {
                "title": "Query",
                "value": "{host}/queries/{query_id}".format(host=host, query_id=query.id),
                "short": True
            },
            {
                "title": "Alert",
                "value": "{host}/alerts/{alert_id}".format(host=host, alert_id=alert.id),
                "short": True
            }
        ]
        if new_state == "triggered":
            text = alert.name + " just triggered"
            color = "#c0392b"
        else:
            text = alert.name + " went back to normal"
            color = "#27ae60"
        
        payload = {'attachments': [{'text': text, 'color': color, 'fields': fields}]}
        try:
            resp = requests.post(options.get('url'), data=json.dumps(payload))
            logging.warning(resp.text)
            if resp.status_code != 200:
                logging.error("Slack send ERROR. status_code => {status}".format(status=resp.status_code))
        except Exception:
            logging.exception("Slack send ERROR.")

register(Slack)
