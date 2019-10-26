import requests

from flask_mail import Message
from redash import mail, models, settings
from redash.models import users
from redash.version_check import run_version_check
from redash.worker import job, get_job_logger

logger = get_job_logger(__name__)


@job('default')
def record_event(raw_event):
    event = models.Event.record(raw_event)
    models.db.session.commit()

    for hook in settings.EVENT_REPORTING_WEBHOOKS:
        logger.debug("Forwarding event to: %s", hook)
        try:
            data = {
                "schema": "iglu:io.redash.webhooks/event/jsonschema/1-0-0",
                "data": event.to_dict()
            }
            response = requests.post(hook, json=data)
            if response.status_code != 200:
                logger.error("Failed posting to %s: %s", hook, response.content)
        except Exception:
            logger.exception("Failed posting to %s", hook)


def version_check():
    run_version_check()


@job('default')
def subscribe(form):
    logger.info("Subscribing to: [security notifications=%s], [newsletter=%s]", form['security_notifications'], form['newsletter'])
    data = {
        'admin_name': form['name'],
        'admin_email': form['email'],
        'org_name': form['org_name'],
        'security_notifications': form['security_notifications'],
        'newsletter': form['newsletter']
    }
    requests.post('https://beacon.redash.io/subscribe', json=data)


@job('default')
def send_mail(to, subject, html, text):
    try:
        message = Message(recipients=to,
                          subject=subject,
                          html=html,
                          body=text)

        mail.send(message)
    except Exception:
        logger.exception('Failed sending message: %s', message.subject)


def sync_user_details():
    users.sync_last_active_at()
