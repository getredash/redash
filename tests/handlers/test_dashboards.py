import json
from tests import BaseTestCase
from redash.models import ApiKey, Dashboard


class DashboardAPITest(BaseTestCase):
    def test_get_dashboard(self):
        d1 = self.factory.create_dashboard()
        rv = self.make_request('get', '/api/dashboards/{0}'.format(d1.slug))
        self.assertEquals(rv.status_code, 200)

        expected = d1.to_dict(with_widgets=True)
        actual = json.loads(rv.data)

        self.assertResponseEqual(expected, actual)

    def test_get_dashboard_filters_unauthorized_widgets(self):
        dashboard = self.factory.create_dashboard()

        restricted_ds = self.factory.create_data_source(group=self.factory.create_group())
        query = self.factory.create_query(data_source=restricted_ds)
        vis = self.factory.create_visualization(query=query)
        restricted_widget = self.factory.create_widget(visualization=vis, dashboard=dashboard)
        widget = self.factory.create_widget(dashboard=dashboard)
        dashboard.layout = '[[{}, {}]]'.format(widget.id, restricted_widget.id)
        dashboard.save()

        rv = self.make_request('get', '/api/dashboards/{0}'.format(dashboard.slug))
        self.assertEquals(rv.status_code, 200)

        self.assertTrue(rv.json['widgets'][0][1]['restricted'])
        self.assertNotIn('restricted', rv.json['widgets'][0][0])

    def test_get_non_existing_dashboard(self):
        rv = self.make_request('get', '/api/dashboards/not_existing')
        self.assertEquals(rv.status_code, 404)

    def test_create_new_dashboard(self):
        dashboard_name = 'Test Dashboard'
        rv = self.make_request('post', '/api/dashboards', data={'name': dashboard_name})
        self.assertEquals(rv.status_code, 200)
        self.assertEquals(rv.json['name'], 'Test Dashboard')
        self.assertEquals(rv.json['user_id'], self.factory.user.id)
        self.assertEquals(rv.json['layout'], [])

    def test_update_dashboard(self):
        d = self.factory.create_dashboard()
        new_name = 'New Name'
        rv = self.make_request('post', '/api/dashboards/{0}'.format(d.id),
                               data={'name': new_name, 'layout': '[]'})
        self.assertEquals(rv.status_code, 200)
        self.assertEquals(rv.json['name'], new_name)

    def test_delete_dashboard(self):
        d = self.factory.create_dashboard()

        rv = self.make_request('delete', '/api/dashboards/{0}'.format(d.slug))
        self.assertEquals(rv.status_code, 200)

        d = Dashboard.get_by_slug_and_org(d.slug, d.org)
        self.assertTrue(d.is_archived)


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
