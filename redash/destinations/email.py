import logging

from flask_mail import Message
from redash import mail, settings
from redash.destinations import *


class Email(BaseDestination):
    @classmethod
    def configuration_schema(cls):
        return {
            "type": "object",
            "properties": {
                "addresses": {"type": "string"},
                "subject_template": {
                    "type": "string",
                    "default": settings.ALERTS_DEFAULT_MAIL_SUBJECT_TEMPLATE,
                    "title": "Subject Template",
                },
            },
            "required": ["addresses"],
            "extra_options": ["subject_template"],
        }

    @classmethod
    def icon(cls):
        return "fa-envelope"

    def notify(self, alert, query, user, new_state, app, host, options):
        recipients = [
            email for email in options.get("addresses", "").split(",") if email
        ]

        if not recipients:
            logging.warning("No emails given. Skipping send.")

        if alert.custom_body:
            html = alert.custom_body
        else:
            html = """
            Check <a href="{host}/alerts/{alert_id}">alert</a> / check
            <a href="{host}/queries/{query_id}">query</a> </br>.
            """.format(
                host=host, alert_id=alert.id, query_id=query.id
            )
        logging.debug("Notifying: %s", recipients)

        try:
            alert_name = alert.name.encode("utf-8", "ignore")
            state = new_state.upper()
            if alert.custom_subject:
                subject = alert.custom_subject
            else:
                subject_template = options.get(
                    "subject_template", settings.ALERTS_DEFAULT_MAIL_SUBJECT_TEMPLATE
                )
                subject = subject_template.format(alert_name=alert_name, state=state)

            message = Message(recipients=recipients, subject=subject, html=html)
            mail.send(message)
        except Exception:
            logging.exception("Mail send error.")


register(Email)
