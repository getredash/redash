import logging

from flask_mail import Message

from redash import mail, settings
from redash.destinations import BaseDestination, register


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

    def notify(self, alert, query, user, new_state, app, host, metadata, options):
        recipients = [email for email in options.get("addresses", "").split(",") if email]

        if not recipients:
            logging.warning("No emails given. Skipping send.")

        if alert.custom_body:
            html = alert.custom_body
        else:
            with open(settings.REDASH_ALERTS_DEFAULT_MAIL_BODY_TEMPLATE_FILE, "r") as f:
                html = alert.render_template(f.read())
        logging.debug("Notifying: %s", recipients)

        try:
            state = new_state.upper()
            if alert.custom_subject:
                subject = alert.custom_subject
            else:
                subject_template = options.get("subject_template", settings.ALERTS_DEFAULT_MAIL_SUBJECT_TEMPLATE)
                subject = subject_template.format(alert_name=alert.name, state=state)

            message = Message(recipients=recipients, subject=subject, html=html)
            mail.send(message)
        except Exception:
            logging.exception("Mail send error.")


register(Email)
