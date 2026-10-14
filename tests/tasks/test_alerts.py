from mock import ANY, MagicMock

import redash.tasks.alerts
from redash.models import Alert
from redash.tasks.alerts import check_alerts_for_query, notify_subscriptions
from tests import BaseTestCase


class TestCheckAlertsForQuery(BaseTestCase):
    def test_notifies_subscribers_when_should(self):
        redash.tasks.alerts.notify_subscriptions = MagicMock()
        Alert.evaluate = MagicMock(return_value=Alert.TRIGGERED_STATE)

        alert = self.factory.create_alert()
        check_alerts_for_query(alert.query_id, metadata={"Scheduled": False})

        self.assertTrue(redash.tasks.alerts.notify_subscriptions.called)

    def test_doesnt_notify_when_nothing_changed(self):
        redash.tasks.alerts.notify_subscriptions = MagicMock()
        Alert.evaluate = MagicMock(return_value=Alert.OK_STATE)

        alert = self.factory.create_alert()
        check_alerts_for_query(alert.query_id, metadata={"Scheduled": False})

        self.assertFalse(redash.tasks.alerts.notify_subscriptions.called)

    def test_doesnt_notify_when_muted(self):
        redash.tasks.alerts.notify_subscriptions = MagicMock()
        Alert.evaluate = MagicMock(return_value=Alert.TRIGGERED_STATE)

        alert = self.factory.create_alert(options={"muted": True})
        check_alerts_for_query(alert.query_id, metadata={"Scheduled": False})

        self.assertFalse(redash.tasks.alerts.notify_subscriptions.called)


class TestNotifySubscriptions(BaseTestCase):
    def test_calls_notify_for_subscribers(self):
        subscription = self.factory.create_alert_subscription()
        subscription.notify = MagicMock()
        notify_subscriptions(subscription.alert, Alert.OK_STATE, metadata={"Scheduled": False})
        subscription.notify.assert_called_with(
            subscription.alert,
            subscription.alert.query_rel,
            subscription.user,
            Alert.OK_STATE,
            ANY,
            ANY,
            ANY,
        )

    def test_skips_disabled_user_email_subscribers(self):
        user = self.factory.create_user(disabled_at="2018-03-08 00:00")
        subscription = self.factory.create_alert_subscription(user=user, destination=None)
        subscription.notify = MagicMock()
        notify_subscriptions(subscription.alert, Alert.OK_STATE, metadata={"Scheduled": False})
        subscription.notify.assert_not_called()

    def test_notifies_destinations_of_disabled_subscribers(self):
        user = self.factory.create_user(disabled_at="2018-03-08 00:00")
        destination = self.factory.create_destination()
        subscription = self.factory.create_alert_subscription(user=user, destination=destination)
        subscription.notify = MagicMock()
        notify_subscriptions(subscription.alert, Alert.OK_STATE, metadata={"Scheduled": False})
        subscription.notify.assert_called()
