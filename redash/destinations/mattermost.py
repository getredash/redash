import logging
import requests

from redash.destinations import *
from redash.utils import json_dumps


class Mattermost(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                }
            },
            "required": ["url"]
        }

    @classmethod
    def icon(cls):
        return 'fa-bolt'

    def notify(self, alert, query, user, new_state, app, host, options):
        try:
            data = {
                'text': alert.name + " just triggered",
                'url_base': host 
            }
            headers = {'Content-Type': 'application/json'}
            auth = None
            resp = requests.post(options.get('url'), data=json_dumps(data), auth=auth, headers=headers)
            if resp.status_code != 200:
                logging.error("Mattermost webhook send ERROR. status_code => {status}".format(status=resp.status_code))
        except Exception:
            logging.exception("Mattermost webhook send ERROR.")


register(Mattermost)
