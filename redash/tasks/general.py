import requests
from celery.utils.log import get_task_logger
from flask_mail import Message
from redash.worker import celery
from redash.version_check import run_version_check
from redash import models, mail, settings

logger = get_task_logger(__name__)


@celery.task(name="redash.tasks.record_event")
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


@celery.task(name="redash.tasks.version_check")
def version_check():
    run_version_check()


@celery.task(name="redash.tasks.subscribe")
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


@celery.task(name="redash.tasks.send_mail")
def send_mail(to, subject, html, text):
    from redash.wsgi import app

    try:
        with app.app_context():
            message = Message(recipients=to,
                              subject=subject,
                              html=html,
                              body=text)

            mail.send(message)
    except Exception:
        logger.exception('Failed sending message: %s', message.subject)
