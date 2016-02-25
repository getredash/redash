from celery.utils.log import get_task_logger
import datetime
from flask.ext.mail import Message
import hipchat
import requests
from redash.utils import json_dumps
from requests.auth import HTTPBasicAuth
from redash.worker import celery
from redash import utils, mail
from redash import models, settings
from .base import BaseTask


logger = get_task_logger(__name__)


def base_url(org):
    if settings.MULTI_ORG:
        return "https://{}/{}".format(settings.HOST, org.slug)

    return settings.HOST


@celery.task(name="redash.tasks.check_alerts_for_query", bind=True, base=BaseTask)
def check_alerts_for_query(self, query_id):
    from redash.wsgi import app

    logger.debug("Checking query %d for alerts", query_id)
    query = models.Query.get_by_id(query_id)
    for alert in query.alerts:
        alert.query = query
        new_state = alert.evaluate()
        passed_rearm_threshold = False
        if alert.rearm and alert.last_triggered_at:
            passed_rearm_threshold = alert.last_triggered_at + datetime.timedelta(seconds=alert.rearm) < utils.utcnow()
        if new_state != alert.state or (alert.state == models.Alert.TRIGGERED_STATE and passed_rearm_threshold ):
            logger.info("Alert %d new state: %s", alert.id, new_state)
            old_state = alert.state
            alert.update_instance(state=new_state, last_triggered_at=utils.utcnow())

            if old_state == models.Alert.UNKNOWN_STATE and new_state == models.Alert.OK_STATE:
                logger.debug("Skipping notification (previous state was unknown and now it's ok).")
                continue

            # message = Message
            html = """
            Check <a href="{host}/alerts/{alert_id}">alert</a> / check <a href="{host}/queries/{query_id}">query</a>.
            """.format(host=base_url(alert.query.org), alert_id=alert.id, query_id=query.id)

            notify_mail(alert, html, new_state, app)

            if settings.HIPCHAT_API_TOKEN:
                notify_hipchat(alert, html, new_state)

            if settings.WEBHOOK_ENDPOINT:
                notify_webhook(alert, query, html, new_state)


def notify_hipchat(alert, html, new_state):
    try:
        if settings.HIPCHAT_API_URL:
            hipchat_client = hipchat.HipChat(token=settings.HIPCHAT_API_TOKEN, url=settings.HIPCHAT_API_URL)
        else:
            hipchat_client = hipchat.HipChat(token=settings.HIPCHAT_API_TOKEN)
        message = '[' + new_state.upper() + '] ' + alert.name + '<br />' + html
        hipchat_client.message_room(settings.HIPCHAT_ROOM_ID, settings.NAME, message.encode('utf-8', 'ignore'), message_format='html')
    except Exception:
        logger.exception("hipchat send ERROR.")


def notify_mail(alert, html, new_state, app):
    recipients = [s.email for s in alert.subscribers()]
    logger.debug("Notifying: %s", recipients)
    try:
        with app.app_context():
            message = Message(recipients=recipients,
                              subject="[{1}] {0}".format(alert.name.encode('utf-8', 'ignore'), new_state.upper()),
                              html=html)
            mail.send(message)
    except Exception:
        logger.exception("mail send ERROR.")


def notify_webhook(alert, query, html, new_state):
    try:
        data = {
            'event': 'alert_state_change',
            'alert': alert.to_dict(full=False),
            'url_base': base_url(query.org)
        }
        headers = {'Content-Type': 'application/json'}
        auth = HTTPBasicAuth(settings.WEBHOOK_USERNAME, settings.WEBHOOK_PASSWORD) if settings.WEBHOOK_USERNAME else None
        resp = requests.post(settings.WEBHOOK_ENDPOINT, data=json_dumps(data), auth=auth, headers=headers)
        if resp.status_code != 200:
            logger.error("webhook send ERROR. status_code => {status}".format(status=resp.status_code))
    except Exception:
        logger.exception("webhook send ERROR.")
