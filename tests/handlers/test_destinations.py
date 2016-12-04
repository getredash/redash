from tests import BaseTestCase
from redash.models import NotificationDestination


class TestDestinationListResource(BaseTestCase):
    def test_get_returns_all_destinations(self):
        d1 = self.factory.create_destination()
        d2 = self.factory.create_destination()

        rv = self.make_request('get', '/api/destinations', user=self.factory.user)
        self.assertEqual(len(rv.json), 2)

    def test_get_returns_only_destinations_of_current_org(self):
        d1 = self.factory.create_destination()
        d2 = self.factory.create_destination()
        d3 = self.factory.create_destination(org=self.factory.create_org())

        rv = self.make_request('get', '/api/destinations', user=self.factory.user)
        self.assertEqual(len(rv.json), 2)

    def test_post_creates_new_destination(self):
        data = {
            'options': {'addresses': 'test@example.com'},
            'name': 'Test',
            'type': 'email'
        }
        rv = self.make_request('post', '/api/destinations', user=self.factory.create_admin(), data=data)
        self.assertEqual(rv.status_code, 200)
        pass

    def test_post_requires_admin(self):
        data = {
            'options': {'addresses': 'test@example.com'},
            'name': 'Test',
            'type': 'email'
        }
        rv = self.make_request('post', '/api/destinations', user=self.factory.user, data=data)
        self.assertEqual(rv.status_code, 403)


class TestDestinationResource(BaseTestCase):
    def test_get(self):
        d = self.factory.create_destination()
        rv = self.make_request('get', '/api/destinations/{}'.format(d.id), user=self.factory.create_admin())
        self.assertEqual(rv.status_code, 200)

    def test_delete(self):
        d = self.factory.create_destination()
        rv = self.make_request('delete', '/api/destinations/{}'.format(d.id), user=self.factory.create_admin())
        self.assertEqual(rv.status_code, 204)
        self.assertIsNone(NotificationDestination.query.get(d.id))

    def test_post(self):
        d = self.factory.create_destination()
        data = {
            'name': 'updated',
            'type': d.type,
            'options': d.options.to_dict()
        }
        rv = self.make_request('post', '/api/destinations/{}'.format(d.id), user=self.factory.create_admin(), data=data)
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(NotificationDestination.query.get(d.id).name, data['name'])


