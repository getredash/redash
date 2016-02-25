from celery.utils.log import get_task_logger
from flask.ext.mail import Message
from redash.worker import celery
from redash.version_check import run_version_check
from redash import models, mail
from .base import BaseTask

logger = get_task_logger(__name__)


@celery.task(name="redash.tasks.record_event", base=BaseTask)
def record_event(event):
    models.Event.record(event)


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
