import json
from tests import BaseTestCase
from redash.models import ApiKey, Dashboard, AccessPermission, db
from redash.permissions import ACCESS_TYPE_MODIFY


class TestRecentDashboardResourceGet(BaseTestCase):
    def test_get_recent_dashboard_list_does_not_include_deleted(self):
        d1 = self.factory.create_dashboard()
        expected = d1.to_dict()
        d2 = self.factory.create_dashboard() # this shouldn't be required but test fails without it
        rv = self.make_request('post', '/api/dashboards/{0}'.format(d1.id),
                       data={'name': 'New Name', 'layout': '[]', 'is_archived': True})
        rvrecent = self.make_request('get', '/api/dashboards/recent')
        self.assertEquals(rvrecent.status_code, 200)
        actual = json.loads(rvrecent.data)
        self.assertNotIn(expected['id'], actual)

class TestDashboardListResource(BaseTestCase):
    def test_create_new_dashboard(self):
        dashboard_name = 'Test Dashboard'
        rv = self.make_request('post', '/api/dashboards', data={'name': dashboard_name})
        self.assertEquals(rv.status_code, 200)
        self.assertEquals(rv.json['name'], 'Test Dashboard')
        self.assertEquals(rv.json['user_id'], self.factory.user.id)
        self.assertEquals(rv.json['layout'], [])


class TestDashboardResourceGet(BaseTestCase):
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
        vis = self.factory.create_visualization(query_rel=query)
        restricted_widget = self.factory.create_widget(visualization=vis, dashboard=dashboard)
        widget = self.factory.create_widget(dashboard=dashboard)
        dashboard.layout = '[[{}, {}]]'.format(widget.id, restricted_widget.id)
        db.session.commit()

        rv = self.make_request('get', '/api/dashboards/{0}'.format(dashboard.slug))
        self.assertEquals(rv.status_code, 200)
        self.assertTrue(rv.json['widgets'][0][1]['restricted'])
        self.assertNotIn('restricted', rv.json['widgets'][0][0])

    def test_get_non_existing_dashboard(self):
        rv = self.make_request('get', '/api/dashboards/not_existing')
        self.assertEquals(rv.status_code, 404)


class TestDashboardResourcePost(BaseTestCase):
    def test_update_dashboard(self):
        d = self.factory.create_dashboard()
        new_name = 'New Name'
        rv = self.make_request('post', '/api/dashboards/{0}'.format(d.id),
                               data={'name': new_name, 'layout': '[]'})
        self.assertEquals(rv.status_code, 200)
        self.assertEquals(rv.json['name'], new_name)

    def test_raises_error_in_case_of_conflict(self):
        d = self.factory.create_dashboard()
        d.name = 'Updated'
        db.session.commit()
        new_name = 'New Name'
        rv = self.make_request('post', '/api/dashboards/{0}'.format(d.id),
                               data={'name': new_name, 'layout': '[]', 'version': d.version - 1})

        self.assertEqual(rv.status_code, 409)

    def test_overrides_existing_if_no_version_specified(self):
        d = self.factory.create_dashboard()
        d.name = 'Updated'

        new_name = 'New Name'
        rv = self.make_request('post', '/api/dashboards/{0}'.format(d.id),
                               data={'name': new_name, 'layout': '[]'})

        self.assertEqual(rv.status_code, 200)

    def test_works_for_non_owner_with_permission(self):
        d = self.factory.create_dashboard()
        user = self.factory.create_user()

        new_name = 'New Name'
        rv = self.make_request('post', '/api/dashboards/{0}'.format(d.id),
                               data={'name': new_name, 'layout': '[]', 'version': d.version}, user=user)
        self.assertEqual(rv.status_code, 403)

        AccessPermission.grant(obj=d, access_type=ACCESS_TYPE_MODIFY, grantee=user, grantor=d.user)

        rv = self.make_request('post', '/api/dashboards/{0}'.format(d.id),
                               data={'name': new_name, 'layout': '[]', 'version': d.version}, user=user)

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json['name'], new_name)


class TestDashboardResourceDelete(BaseTestCase):
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

        user.group_ids.append(self.factory.org.admin_group.id)

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

        user.group_ids.append(self.factory.org.admin_group.id)

        res = self.make_request('delete', '/api/dashboards/{}/share'.format(dashboard.id), user=user)
        self.assertEqual(res.status_code, 200)

class TestDashboardSearchResourceGet(BaseTestCase):
    def create_dashboard_sequence(self):
        d1 = self.factory.create_dashboard()
        new_name = 'Analytics'
        rv1 = self.make_request('post', '/api/dashboards/{0}'.format(d1.id),
                               data={'name': new_name, 'layout': '[]', 'is_draft': False})
        d2 = self.factory.create_dashboard()
        rv2 = self.make_request('post', '/api/dashboards/{0}'.format(d2.id),
                               data={'name': 'Metrics', 'layout': '[]', 'is_draft': True})
        user = self.factory.create_user()
        return d1, d2, user

    def test_get_dashboard_search_results_does_not_contain_deleted(self):
        d1, d2, user = self.create_dashboard_sequence()
        res = self.make_request('delete', '/api/dashboards/{}/share'.format(d2.id))
        dash_search_list = self.make_request('get','/api/dashboards/search?q=Metrics')
        dash_search_list_json = json.loads(dash_search_list.data)
        self.assertNotIn(d2.id, dash_search_list_json)

    def test_get_dashboard_search_results_obeys_draft_flag(self):
        d1, d2, user = self.create_dashboard_sequence()
        dash_search_list = self.make_request('get','/api/dashboards/search?q=Metrics&test=True&user_id={}'.format(user.id))
        dash_search_list_json = json.loads(dash_search_list.data)
        self.assertNotIn(d2.id, dash_search_list_json)
        #self.assertIn(d1.id, dash_search_list_json)


