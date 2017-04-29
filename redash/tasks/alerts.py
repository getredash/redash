from celery.utils.log import get_task_logger
from flask import current_app
import datetime
from redash.worker import celery
from redash import utils
from redash import models, settings


logger = get_task_logger(__name__)


def base_url(org):
    if settings.MULTI_ORG:
        return "https://{}/{}".format(settings.HOST, org.slug)

    return settings.HOST


def notify_subscriptions(alert, new_state):
    host = base_url(alert.query_rel.org)
    for subscription in alert.subscriptions:
        try:
            subscription.notify(alert, alert.query_rel, subscription.user, new_state, current_app, host)
        except Exception as e:
            logger.exception("Error with processing destination")


def should_notify(alert, new_state):
    passed_rearm_threshold = False
    if alert.rearm and alert.last_triggered_at:
        passed_rearm_threshold = alert.last_triggered_at + datetime.timedelta(seconds=alert.rearm) < utils.utcnow()

    return new_state != alert.state or (alert.state == models.Alert.TRIGGERED_STATE and passed_rearm_threshold)


@celery.task(name="redash.tasks.check_alerts_for_query")
def check_alerts_for_query(query_id):
    logger.debug("Checking query %d for alerts", query_id)

    query = models.Query.query.get(query_id)

    for alert in query.alerts:
        new_state = alert.evaluate()

        if should_notify(alert, new_state):
            logger.info("Alert %d new state: %s", alert.id, new_state)
            old_state = alert.state

            alert.state = new_state
            alert.last_triggered_at = utils.utcnow()
            models.db.session.commit()

            if old_state == models.Alert.UNKNOWN_STATE and new_state == models.Alert.OK_STATE:
                logger.debug("Skipping notification (previous state was unknown and now it's ok).")
                continue

            notify_subscriptions(alert, new_state)
