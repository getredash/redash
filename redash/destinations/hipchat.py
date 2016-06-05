import logging
import hipchat

from redash import settings
from redash.destinations import *


class HipChat(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string"
                },
                "token": {
                    "type": "string"
                },
                "room_id": {
                    "type": "string"
                }
            },
            "required": ["token", "room_id"],
            "secret": ["token"]
        }

    @classmethod
    def icon(cls):
        return 'fa-comment-o'

    def notify(self, alert, query, user, new_state, app, host, options):
        try:
            if options.url:
                hipchat_client = hipchat.HipChat(token=options.token, url=options.url)
            else:
                hipchat_client = hipchat.HipChat(token=options.token)
            html = """
            Check <a href="{host}/alerts/{alert_id}">alert</a> / check <a href="{host}/queries/{query_id}">query</a>.
            """.format(host=host, alert_id=alert.id, query_id=query.id)
            message = '[' + new_state.upper() + '] ' + alert.name + '<br />' + html
            hipchat_client.message_room(options.room_id, settings.NAME, message.encode('utf-8', 'ignore'), message_format='html')
        except Exception:
            logging.exception("hipchat send ERROR.")


register(HipChat)
