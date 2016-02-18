from redash.destinations import *


class Slack(BaseDestination):

    @classmethod
    def configuration_schema(cls):
        return {
            'type': 'object',
            'properties': {
                'url': {
                    'type': 'string',
                    'title': 'Slack webhook URL'
                }
            }
        }

    def notify(self, query):
        pass

register(Slack)
