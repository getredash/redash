import datetime

from mock import patch

from redash.models import Alert, AlertSubscription, db
from redash.utils import utcnow
from tests import BaseTestCase


class TestAlertResourceGet(BaseTestCase):
    def test_returns_200_if_allowed(self):
        alert = self.factory.create_alert()

        rv = self.make_request("get", "/api/alerts/{}".format(alert.id))
        self.assertEqual(rv.status_code, 200)

    def test_returns_403_if_not_allowed(self):
        data_source = self.factory.create_data_source(group=self.factory.create_group())
        query = self.factory.create_query(data_source=data_source)
        alert = self.factory.create_alert(query_rel=query)
        db.session.commit()
        rv = self.make_request("get", "/api/alerts/{}".format(alert.id))
        self.assertEqual(rv.status_code, 403)

    def test_returns_404_if_admin_from_another_org(self):
        second_org = self.factory.create_org()
        second_org_admin = self.factory.create_admin(org=second_org)

        alert = self.factory.create_alert()

        rv = self.make_request(
            "get",
            "/api/alerts/{}".format(alert.id),
            org=second_org,
            user=second_org_admin,
        )
        self.assertEqual(rv.status_code, 404)


class TestAlertResourcePost(BaseTestCase):
    def test_updates_alert(self):
        alert = self.factory.create_alert()
        rv = self.make_request("post", "/api/alerts/{}".format(alert.id), data={"name": "Testing"})
        self.assertEqual(rv.status_code, 200)


class TestAlertEvaluateResource(BaseTestCase):
    @patch("redash.handlers.alerts.notify_subscriptions")
    def test_evaluates_alert_and_notifies(self, mock_notify_subscriptions):
        query = self.factory.create_query(
            data_source=self.factory.create_data_source(group=self.factory.create_group())
        )
        retrieved_at = utcnow() - datetime.timedelta(days=1)
        query_result = self.factory.create_query_result(
            retrieved_at=retrieved_at,
            query_text=query.query_text,
            query_hash=query.query_hash,
        )
        query.latest_query_data = query_result
        alert = self.factory.create_alert(query_rel=query)
        rv = self.make_request("post", "/api/alerts/{}/eval".format(alert.id))

        self.assertEqual(rv.status_code, 200)
        mock_notify_subscriptions.assert_called()


class TestAlertResourceDelete(BaseTestCase):
    def test_removes_alert_and_subscriptions(self):
        subscription = self.factory.create_alert_subscription()
        alert = subscription.alert
        db.session.commit()
        rv = self.make_request("delete", "/api/alerts/{}".format(alert.id))
        self.assertEqual(rv.status_code, 200)

        self.assertEqual(Alert.query.get(subscription.alert.id), None)
        self.assertEqual(AlertSubscription.query.get(subscription.id), None)

    def test_returns_403_if_not_allowed(self):
        alert = self.factory.create_alert()

        user = self.factory.create_user()
        rv = self.make_request("delete", "/api/alerts/{}".format(alert.id), user=user)
        self.assertEqual(rv.status_code, 403)

        rv = self.make_request(
            "delete",
            "/api/alerts/{}".format(alert.id),
            user=self.factory.create_admin(),
        )
        self.assertEqual(rv.status_code, 200)

    def test_returns_404_for_unauthorized_users(self):
        alert = self.factory.create_alert()

        second_org = self.factory.create_org()
        second_org_admin = self.factory.create_admin(org=second_org)
        rv = self.make_request("delete", "/api/alerts/{}".format(alert.id), user=second_org_admin)
        self.assertEqual(rv.status_code, 404)


class TestAlertListGet(BaseTestCase):
    def test_returns_all_alerts(self):
        alert = self.factory.create_alert()
        rv = self.make_request("get", "/api/alerts")

        self.assertEqual(rv.status_code, 200)

        alert_ids = [a["id"] for a in rv.json]
        self.assertIn(alert.id, alert_ids)

    def test_returns_alerts_only_from_users_groups(self):
        alert = self.factory.create_alert()
        query = self.factory.create_query(
            data_source=self.factory.create_data_source(group=self.factory.create_group())
        )
        alert2 = self.factory.create_alert(query_rel=query)
        rv = self.make_request("get", "/api/alerts")

        self.assertEqual(rv.status_code, 200)

        alert_ids = [a["id"] for a in rv.json]
        self.assertIn(alert.id, alert_ids)
        self.assertNotIn(alert2.id, alert_ids)


class TestAlertListPost(BaseTestCase):
    def test_returns_200_if_has_access_to_query(self):
        query = self.factory.create_query()
        destination = self.factory.create_destination()
        db.session.commit()
        rv = self.make_request(
            "post",
            "/api/alerts",
            data=dict(
                name="Alert",
                query_id=query.id,
                destination_id=destination.id,
                options={},
                rearm=100,
            ),
        )
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["rearm"], 100)

    def test_fails_if_doesnt_have_access_to_query(self):
        data_source = self.factory.create_data_source(group=self.factory.create_group())
        query = self.factory.create_query(data_source=data_source)
        destination = self.factory.create_destination()
        db.session.commit()
        rv = self.make_request(
            "post",
            "/api/alerts",
            data=dict(
                name="Alert",
                query_id=query.id,
                destination_id=destination.id,
                options={},
            ),
        )
        self.assertEqual(rv.status_code, 403)


class TestAlertSubscriptionListResourcePost(BaseTestCase):
    def test_subscribers_user_to_alert(self):
        alert = self.factory.create_alert()
        destination = self.factory.create_destination()

        rv = self.make_request(
            "post",
            "/api/alerts/{}/subscriptions".format(alert.id),
            data=dict(destination_id=destination.id),
        )
        self.assertEqual(rv.status_code, 200)
        self.assertIn(self.factory.user, alert.subscribers())

    def test_doesnt_subscribers_user_to_alert_without_access(self):
        data_source = self.factory.create_data_source(group=self.factory.create_group())
        query = self.factory.create_query(data_source=data_source)
        alert = self.factory.create_alert(query_rel=query)
        destination = self.factory.create_destination()

        rv = self.make_request(
            "post",
            "/api/alerts/{}/subscriptions".format(alert.id),
            data=dict(destination_id=destination.id),
        )
        self.assertEqual(rv.status_code, 403)
        self.assertNotIn(self.factory.user, alert.subscribers())


class TestAlertSubscriptionListResourceGet(BaseTestCase):
    def test_returns_subscribers(self):
        alert = self.factory.create_alert()

        rv = self.make_request("get", "/api/alerts/{}/subscriptions".format(alert.id))
        self.assertEqual(rv.status_code, 200)

    def test_doesnt_return_subscribers_when_not_allowed(self):
        data_source = self.factory.create_data_source(group=self.factory.create_group())
        query = self.factory.create_query(data_source=data_source)
        alert = self.factory.create_alert(query_rel=query)

        rv = self.make_request("get", "/api/alerts/{}/subscriptions".format(alert.id))
        self.assertEqual(rv.status_code, 403)


class TestAlertSubscriptionresourceDelete(BaseTestCase):
    def test_only_subscriber_or_admin_can_unsubscribe(self):
        subscription = self.factory.create_alert_subscription()
        alert = subscription.alert
        user = subscription.user
        path = "/api/alerts/{}/subscriptions/{}".format(alert.id, subscription.id)

        other_user = self.factory.create_user()

        response = self.make_request("delete", path, user=other_user)
        self.assertEqual(response.status_code, 403)

        response = self.make_request("delete", path, user=user)
        self.assertEqual(response.status_code, 200)

        subscription_two = AlertSubscription(alert=alert, user=other_user)
        admin_user = self.factory.create_admin()
        db.session.add_all([subscription_two, admin_user])
        db.session.commit()
        path = "/api/alerts/{}/subscriptions/{}".format(alert.id, subscription_two.id)
        response = self.make_request("delete", path, user=admin_user)
        self.assertEqual(response.status_code, 200)
