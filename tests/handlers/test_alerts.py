from tests import BaseTestCase
from redash.models import AlertSubscription, Alert


class TestAlertResourceGet(BaseTestCase):
    def test_returns_200_if_allowed(self):
        alert = self.factory.create_alert()

        rv = self.make_request('get', "/api/alerts/{}".format(alert.id))
        self.assertEqual(rv.status_code, 200)

    def test_returns_403_if_not_allowed(self):
        data_source = self.factory.create_data_source(group=self.factory.create_group())
        query = self.factory.create_query(data_source=data_source)
        alert = self.factory.create_alert(query=query)

        rv = self.make_request('get', "/api/alerts/{}".format(alert.id))
        self.assertEqual(rv.status_code, 403)

    def test_returns_404_if_admin_from_another_org(self):
        second_org = self.factory.create_org()
        second_org_admin = self.factory.create_admin(org=second_org)

        alert = self.factory.create_alert()

        rv = self.make_request('get', "/api/alerts/{}".format(alert.id), org=second_org, user=second_org_admin)
        self.assertEqual(rv.status_code, 404)


class TestAlertResourceDelete(BaseTestCase):
    def test_removes_alert_and_subscriptions(self):
        subscription = self.factory.create_alert_subscription()
        alert = subscription.alert

        rv = self.make_request('delete', "/api/alerts/{}".format(alert.id))
        self.assertEqual(rv.status_code, 200)

        self.assertRaises(Alert.DoesNotExist, Alert.get_by_id, subscription.alert.id)
        self.assertRaises(AlertSubscription.DoesNotExist, AlertSubscription.get_by_id, subscription.id)

    def test_returns_403_if_not_allowed(self):
        alert = self.factory.create_alert()

        user = self.factory.create_user()
        rv = self.make_request('delete', "/api/alerts/{}".format(alert.id), user=user)
        self.assertEqual(rv.status_code, 403)

        rv = self.make_request('delete', "/api/alerts/{}".format(alert.id), user=self.factory.create_admin())
        self.assertEqual(rv.status_code, 200)

    def test_returns_404_for_unauthorized_users(self):
        alert = self.factory.create_alert()

        second_org = self.factory.create_org()
        second_org_admin = self.factory.create_admin(org=second_org)
        rv = self.make_request('delete', "/api/alerts/{}".format(alert.id), user=second_org_admin)
        self.assertEqual(rv.status_code, 404)


class TestAlertListPost(BaseTestCase):
    def test_returns_200_if_has_access_to_query(self):
        query = self.factory.create_query()
        destination = self.factory.create_destination()

        rv = self.make_request('post', "/api/alerts", data=dict(name='Alert', query_id=query.id,
                                                                destination_id=destination.id, options={}))
        self.assertEqual(rv.status_code, 200)

    def test_fails_if_doesnt_have_access_to_query(self):
        data_source = self.factory.create_data_source(group=self.factory.create_group())
        query = self.factory.create_query(data_source=data_source)
        destination = self.factory.create_destination()

        rv = self.make_request('post', "/api/alerts", data=dict(name='Alert', query_id=query.id,
                                                                destination_id=destination.id, options={}))
        self.assertEqual(rv.status_code, 403)


class TestAlertSubscriptionListResourcePost(BaseTestCase):
    def test_subscribers_user_to_alert(self):
        alert = self.factory.create_alert()
        destination = self.factory.create_destination()

        rv = self.make_request('post', "/api/alerts/{}/subscriptions".format(alert.id), data=dict(destination_id=destination.id))
        self.assertEqual(rv.status_code, 200)
        self.assertIn(self.factory.user, alert.subscribers())

    def test_doesnt_subscribers_user_to_alert_without_access(self):
        data_source = self.factory.create_data_source(group=self.factory.create_group())
        query = self.factory.create_query(data_source=data_source)
        alert = self.factory.create_alert(query=query)
        destination = self.factory.create_destination()

        rv = self.make_request('post', "/api/alerts/{}/subscriptions".format(alert.id), data=dict(destination_id=destination.id))
        self.assertEqual(rv.status_code, 403)
        self.assertNotIn(self.factory.user, alert.subscribers())


class TestAlertSubscriptionListResourceGet(BaseTestCase):
    def test_returns_subscribers(self):
        alert = self.factory.create_alert()

        rv = self.make_request('get', "/api/alerts/{}/subscriptions".format(alert.id))
        self.assertEqual(rv.status_code, 200)

    def test_doesnt_return_subscribers_when_not_allowed(self):
        data_source = self.factory.create_data_source(group=self.factory.create_group())
        query = self.factory.create_query(data_source=data_source)
        alert = self.factory.create_alert(query=query)

        rv = self.make_request('get', "/api/alerts/{}/subscriptions".format(alert.id))
        self.assertEqual(rv.status_code, 403)


class TestAlertSubscriptionresourceDelete(BaseTestCase):
    def test_only_subscriber_or_admin_can_unsubscribe(self):
        subscription = self.factory.create_alert_subscription()
        alert = subscription.alert
        user = subscription.user
        path = '/api/alerts/{}/subscriptions/{}'.format(alert.id, subscription.id)

        other_user = self.factory.create_user()

        response = self.make_request('delete', path, user=other_user)
        self.assertEqual(response.status_code, 403)

        response = self.make_request('delete', path, user=user)
        self.assertEqual(response.status_code, 200)

        subscription_two = AlertSubscription.create(alert=alert, user=other_user)
        path = '/api/alerts/{}/subscriptions/{}'.format(alert.id, subscription_two.id)
        response = self.make_request('delete', path, user=self.factory.create_admin())
        self.assertEqual(response.status_code, 200)
