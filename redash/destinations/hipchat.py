import json
import logging
import requests

from redash.destinations import *
from redash.models import Alert


colors = {
    Alert.OK_STATE: 'green',
    Alert.TRIGGERED_STATE: 'red',
    Alert.UNKNOWN_STATE: 'yellow'
}


class HipChat(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "title": "HipChat Notification URL (get it from the Integrations page)"
                },
            },
            "required": ["url"]
        }

    @classmethod
    def icon(cls):
        return 'fa-comment-o'

    def notify(self, alert, query, user, new_state, app, host, options):
        try:
            alert_url = '{host}/alerts/{alert_id}'.format(host=host, alert_id=alert.id);
            query_url = '{host}/queries/{query_id}'.format(host=host, query_id=query.id);

            message = u'<a href="{alert_url}">{alert_name}</a> changed state to {new_state} (based on <a href="{query_url}">this query</a>).'.format(
                alert_name=alert.name, new_state=new_state.upper(),
                alert_url=alert_url,
                query_url=query_url)

            data = {
                'message': message,
                'color': colors.get(new_state, 'green')
            }
            headers = {'Content-Type': 'application/json'}
            response = requests.post(options['url'], data=json.dumps(data), headers=headers)

            if response.status_code != 204:
                logging.error('Bad status code received from HipChat: %d', response.status_code)
        except Exception:
            logging.exception("HipChat Send ERROR.")


register(HipChat)
