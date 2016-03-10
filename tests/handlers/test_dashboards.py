from tests import BaseTestCase
from redash.models import ApiKey


class TestDashboardShareResourcePost(BaseTestCase):
    def test_creates_api_key(self):
        dashboard = self.factory.create_dashboard()

        res = self.make_request('post', '/api/dashboards/{}/share'.format(dashboard.id))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json['api_key'], ApiKey.get_by_object(dashboard).api_key)

    def test_requires_admin_or_owner(self):
        dashboard = self.factory.create_dashboard()
        user = self.factory.create_user()

        res = self.make_request('post', '/api/dashboards/{}/share'.format(dashboard.id), user=user)
        self.assertEqual(res.status_code, 403)

        user.groups.append(self.factory.org.admin_group.id)
        user.save()

        res = self.make_request('post', '/api/dashboards/{}/share'.format(dashboard.id), user=user)
        self.assertEqual(res.status_code, 200)


class TestDashboardShareResourceDelete(BaseTestCase):
    def test_disables_api_key(self):
        dashboard = self.factory.create_dashboard()
        ApiKey.create_for_object(dashboard, self.factory.user)

        res = self.make_request('delete', '/api/dashboards/{}/share'.format(dashboard.id))
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(ApiKey.get_by_object(dashboard))

    def test_ignores_when_no_api_key_exists(self):
        dashboard = self.factory.create_dashboard()

        res = self.make_request('delete', '/api/dashboards/{}/share'.format(dashboard.id))
        self.assertEqual(res.status_code, 200)

    def test_requires_admin_or_owner(self):
        dashboard = self.factory.create_dashboard()
        user = self.factory.create_user()

        res = self.make_request('delete', '/api/dashboards/{}/share'.format(dashboard.id), user=user)
        self.assertEqual(res.status_code, 403)

        user.groups.append(self.factory.org.admin_group.id)
        user.save()

        res = self.make_request('delete', '/api/dashboards/{}/share'.format(dashboard.id), user=user)
        self.assertEqual(res.status_code, 200)
