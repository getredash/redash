from tests import BaseTestCase
from tests.factories import org_factory
from tests.handlers import authenticated_user, json_request
from redash.wsgi import app
from redash.models import AlertSubscription


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
