import requests
from celery.utils.log import get_task_logger
from flask_mail import Message
from redash.worker import celery
from redash.version_check import run_version_check
from redash import models, mail, settings
from .base import BaseTask

logger = get_task_logger(__name__)


@celery.task(name="redash.tasks.record_event", base=BaseTask)
def record_event(event):
    original_event = event.copy()
    models.Event.record(event)
    models.db.session.commit()
    for hook in settings.EVENT_REPORTING_WEBHOOKS:
        logger.debug("Forwarding event to: %s", hook)
        try:
            response = requests.post(hook, original_event)
            if response.status_code != 200:
                logger.error("Failed posting to %s: %s", hook, response.content)
        except Exception:
            logger.exception("Failed posting to %s", hook)


@celery.task(name="redash.tasks.version_check", base=BaseTask)
def version_check():
    run_version_check()


@celery.task(name="redash.tasks.send_mail", base=BaseTask)
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
