from celery.utils.log import get_task_logger
import datetime
from redash.worker import celery
from redash import utils
from redash import models, settings
from .base import BaseTask


logger = get_task_logger(__name__)


def base_url(org):
    if settings.MULTI_ORG:
        return "https://{}/{}".format(settings.HOST, org.slug)

    return settings.HOST


@celery.task(name="redash.tasks.check_alerts_for_query", base=BaseTask)
def check_alerts_for_query(query_id):
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

            host = base_url(alert.query.org)
            for subscription in alert.subscriptions:
                try:
                    subscription.notify(alert, query, subscription.user, new_state, app, host)
                except Exception as e:
                    logger.warn("Exception: {}".format(e))

