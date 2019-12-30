from tests import BaseTestCase
from mock import MagicMock, ANY

import redash.tasks.alerts
from redash.tasks.alerts import (
    check_alerts_for_query,
    notify_subscriptions,
    should_notify,
)
from redash.models import Alert


class TestCheckAlertsForQuery(BaseTestCase):
    def test_notifies_subscribers_when_should(self):
        redash.tasks.alerts.notify_subscriptions = MagicMock()
        Alert.evaluate = MagicMock(return_value=Alert.TRIGGERED_STATE)

        alert = self.factory.create_alert()
        check_alerts_for_query(alert.query_id)

        self.assertTrue(redash.tasks.alerts.notify_subscriptions.called)

    def test_doesnt_notify_when_nothing_changed(self):
        redash.tasks.alerts.notify_subscriptions = MagicMock()
        Alert.evaluate = MagicMock(return_value=Alert.OK_STATE)

        alert = self.factory.create_alert()
        check_alerts_for_query(alert.query_id)

        self.assertFalse(redash.tasks.alerts.notify_subscriptions.called)

    def test_doesnt_notify_when_muted(self):
        redash.tasks.alerts.notify_subscriptions = MagicMock()
        Alert.evaluate = MagicMock(return_value=Alert.TRIGGERED_STATE)

        alert = self.factory.create_alert(options={"muted": True})
        check_alerts_for_query(alert.query_id)

        self.assertFalse(redash.tasks.alerts.notify_subscriptions.called)


class TestNotifySubscriptions(BaseTestCase):
    def test_calls_notify_for_subscribers(self):
        subscription = self.factory.create_alert_subscription()
        subscription.notify = MagicMock()
        notify_subscriptions(subscription.alert, Alert.OK_STATE)
        subscription.notify.assert_called_with(
            subscription.alert,
            subscription.alert.query_rel,
            subscription.user,
            Alert.OK_STATE,
            ANY,
            ANY,
        )
