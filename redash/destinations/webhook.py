import logging
import requests
from requests.auth import HTTPBasicAuth

from redash.destinations import *
from redash.utils import json_dumps


class Webhook(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                },
                "username": {
                    "type": "string"
                },
                "password": {
                    "type": "string"
                }
            },
            "required": ["url"],
            "secret": ["password"]
        }

    @classmethod
    def icon(cls):
        return 'fa-bolt'

    def notify(self, alert, query, user, new_state, app, host, options):
        try:
            data = {
                'event': 'alert_state_change',
                'alert': alert.to_dict(full=False),
                'url_base': host 
            }
            headers = {'Content-Type': 'application/json'}
            auth = HTTPBasicAuth(options.get('username'), options.get('password')) if options.get('username') else None
            resp = requests.post(options.get('url'), data=json_dumps(data), auth=auth, headers=headers)
            if resp.status_code != 200:
                logging.error("webhook send ERROR. status_code => {status}".format(status=resp.status_code))
        except Exception:
            logging.exception("webhook send ERROR.")


register(Webhook)
