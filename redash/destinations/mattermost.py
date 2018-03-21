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
        alert_url = '[Alert link]({host}/alerts/{alert_id})'.format(host=host, alert_id=alert.id)
        query_url = '[Query link]({host}/queries/{query_id})'.format(host=host, query_id=query.id)
        text_content = '''
                   | Name       | Link          |
                   |:-----------|:--------------|
                   | Query      | {query_url}   | 
                   | Alert      | {alert_url}   | 
                   '''.format(alert_url=alert_url, query_url=query_url)
        if new_state == "triggered":
            text = "####" + alert.name + " just triggered \n" + text_content
        else:
            text = "####" + alert.name + " went back to normal \n" + text_content

        payload = {'text': text}
        if options.get('username'): payload['username'] = options.get('username')
        if options.get('icon_url'): payload['icon_url'] = options.get('icon_url')
        if options.get('channel'): payload['channel'] = options.get('channel')

        try:
            resp = requests.post(options.get('url'), data=json.dumps(payload))
            logging.warning(resp.text)
            if resp.status_code != 200:
                logging.error("Mattermost send ERROR. status_code => {status}".format(status=resp.status_code))
        except Exception:
            logging.exception("Mattermost send ERROR.")


register(Mattermost)
