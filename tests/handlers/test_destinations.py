from tests import BaseTestCase
from mock import patch

from redash.models import NotificationDestination
from redash.destinations.slack import Slack


class TestDestinationListResource(BaseTestCase):
    def test_get_returns_all_destinations(self):
        d1 = self.factory.create_destination()
        d2 = self.factory.create_destination()

        rv = self.make_request("get", "/api/destinations", user=self.factory.user)
        self.assertEqual(len(rv.json), 2)

    def test_get_returns_only_destinations_of_current_org(self):
        d1 = self.factory.create_destination()
        d2 = self.factory.create_destination()
        d3 = self.factory.create_destination(org=self.factory.create_org())

        rv = self.make_request("get", "/api/destinations", user=self.factory.user)
        self.assertEqual(len(rv.json), 2)

    def test_post_creates_new_destination(self):
        data = {
            "options": {"addresses": "test@example.com"},
            "name": "Test",
            "type": "email",
        }
        rv = self.make_request(
            "post", "/api/destinations", user=self.factory.create_admin(), data=data
        )
        self.assertEqual(rv.status_code, 200)
        pass

    def test_post_requires_admin(self):
        data = {
            "options": {"addresses": "test@example.com"},
            "name": "Test",
            "type": "email",
        }
        rv = self.make_request(
            "post", "/api/destinations", user=self.factory.user, data=data
        )
        self.assertEqual(rv.status_code, 403)

    def test_returns_400_when_name_already_exists(self):
        d1 = self.factory.create_destination()
        data = {
            "options": {"addresses": "test@example.com"},
            "name": d1.name,
            "type": "email",
        }

        rv = self.make_request(
            "post", "/api/destinations", user=self.factory.create_admin(), data=data
        )
        self.assertEqual(rv.status_code, 400)


class TestDestinationResource(BaseTestCase):
    def test_get(self):
        d = self.factory.create_destination()
        rv = self.make_request(
            "get", "/api/destinations/{}".format(d.id), user=self.factory.create_admin()
        )
        self.assertEqual(rv.status_code, 200)

    def test_delete(self):
        d = self.factory.create_destination()
        rv = self.make_request(
            "delete",
            "/api/destinations/{}".format(d.id),
            user=self.factory.create_admin(),
        )
        self.assertEqual(rv.status_code, 204)
        self.assertIsNone(NotificationDestination.query.get(d.id))

    def test_post(self):
        d = self.factory.create_destination()
        data = {
            "name": "updated",
            "type": d.type,
            "options": {"url": "https://www.slack.com/updated"},
        }

        with self.app.app_context():
            rv = self.make_request(
                "post",
                "/api/destinations/{}".format(d.id),
                user=self.factory.create_admin(),
                data=data,
            )

        self.assertEqual(rv.status_code, 200)

        d = NotificationDestination.query.get(d.id)
        self.assertEqual(d.name, data["name"])
        self.assertEqual(d.options["url"], data["options"]["url"])


class DestinationTypesTest(BaseTestCase):
    def test_does_not_show_deprecated_types(self):
        admin = self.factory.create_admin()
        with patch.object(Slack, "deprecated", return_value=True):
            rv = self.make_request("get", "/api/destinations/types", user=admin)

        types = [destination_type["type"] for destination_type in rv.json]
        self.assertNotIn("slack", types)
