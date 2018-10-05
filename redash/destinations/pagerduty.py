import pypd
import logging

from redash.destinations import *


class Pagerduty(BaseDestination):

    KEY_STRING = '{user_name}_{user_email}_{query_id}_{query_name}'
    DESCRIPTION_STR = 'redash_{query_id}_{query_name}'

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'integration_key': {
                    'type': 'string',
                    'title': 'Pagerduty Service Integration Key'
                },
                'description': {
                    'type': 'string',
                    'title': 'Description for the event, defaults to query',
                }
            },
            "required": ["integration_key"]
        }

    @classmethod
    def icon(cls):
        return 'creative-commons-pd-alt'

    def notify(self, alert, query, user, new_state, app, host, options):

        default_desc = self.DESCRIPTION_STR.format(query_id=query.id, query_name=query.lowercase_name)

        if options.get('description'):
            default_desc = options.get('description')

        incident_key = self.KEY_STRING.format(user_name=user.name, user_email=user.email, query_id=query.id, query_name=query.lowercase_name)
        data = {
            'routing_key': options.get('integration_key'),
            'incident_key': incident_key,
            'dedup_key': incident_key,
            'payload': {
                'summary': default_desc,
                'severity': 'error',
                'source': 'redash',
            }
        }

        if new_state == "triggered":
            data['event_action'] = 'trigger'
        else:
            data['event_action'] = 'resolve'

        try:

            ev = pypd.EventV2.create(data=data)
            logging.warning(ev)

        except Exception:
            logging.exception("Pagerduty trigger failed!")


register(Pagerduty)
