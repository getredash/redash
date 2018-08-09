import json
import logging
import requests

from redash.destinations import *


class Mattermost(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'url': {
                    'type': 'string',
                    'title': 'Mattermost Webhook URL'
                },
                'username': {
                    'type': 'string',
                    'title': 'Username'
                },
                'icon_url': {
                    'type': 'string',
                    'title': 'Icon (URL)'
                },
                'channel': {
                    'type': 'string',
                    'title': 'Channel'
                }
            }
        }

    @classmethod
    def icon(cls):
        return 'fa-bolt'

    def notify(self, alert, query, user, new_state, app, host, options):
        if new_state == "triggered":
            text = "####" + alert.name + " just triggered"
        else:
            text = "####" + alert.name + " went back to normal"

        payload = {'text': text}
        if options.get('username'): payload['username'] = options.get('username')
        if options.get('icon_url'): payload['icon_url'] = options.get('icon_url')
        if options.get('channel'): payload['channel'] = options.get('channel')

        try:
            resp = requests.post(options.get('url'), data=json.dumps(payload))
            logging.warning(resp.text)

            if resp.status_code != 200:
                logging.error("Mattermost webhook send ERROR. status_code => {status}".format(status=resp.status_code))
        except Exception:
            logging.exception("Mattermost webhook send ERROR.")


register(Mattermost)
