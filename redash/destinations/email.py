import logging

from flask_mail import Message
from redash import models, mail
from redash.destinations import *


class Email(BaseDestination):

    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "addresses": {
                    "type": "string"
                },
            },
            "required": ["addresses"]
        }

    @classmethod
    def icon(cls):
        return 'fa-envelope'

    def notify(self, alert, query, user, new_state, app, host, options):
        recipients = [email for email in options.get('addresses').split(',') if email]
        html = """
        Check <a href="{host}/alerts/{alert_id}">alert</a> / check <a href="{host}/queries/{query_id}">query</a>.
        """.format(host=host, alert_id=alert.id, query_id=query.id)
        logging.debug("Notifying: %s", recipients)

        try:
            with app.app_context():
                message = Message(
                    recipients=recipients,
                    subject="[{1}] {0}".format(alert.name.encode('utf-8', 'ignore'), new_state.upper()),
                    html=html
                )
                mail.send(message)
        except Exception:
            logging.exception("mail send ERROR.")

register(Email)
