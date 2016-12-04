from tests import BaseTestCase
from redash import models
from redash.models import db

from redash.permissions import ACCESS_TYPE_MODIFY


class TestQueryResourceGet(BaseTestCase):
    def test_get_query(self):
        query = self.factory.create_query()

        rv = self.make_request('get', '/api/queries/{0}'.format(query.id))

        self.assertEquals(rv.status_code, 200)
        expected = query.to_dict(with_visualizations=True)
        expected['can_edit'] = True
        self.assertResponseEqual(expected, rv.json)

    def test_get_all_queries(self):
        queries = [self.factory.create_query() for _ in range(10)]

        rv = self.make_request('get', '/api/queries')

        self.assertEquals(rv.status_code, 200)
        self.assertEquals(len(rv.json['results']), 10)

    def test_query_without_data_source_should_be_available_only_by_admin(self):
        query = self.factory.create_query()
        query.data_source = None
        db.session.add(query)

        rv = self.make_request('get', '/api/queries/{}'.format(query.id))
        self.assertEquals(rv.status_code, 403)

        rv = self.make_request('get', '/api/queries/{}'.format(query.id), user=self.factory.create_admin())
        self.assertEquals(rv.status_code, 200)

    def test_query_only_accessible_to_users_from_its_organization(self):
        second_org = self.factory.create_org()
        second_org_admin = self.factory.create_admin(org=second_org)

        query = self.factory.create_query()
        query.data_source = None
        db.session.add(query)

        rv = self.make_request('get', '/api/queries/{}'.format(query.id), user=second_org_admin)
        self.assertEquals(rv.status_code, 404)

        rv = self.make_request('get', '/api/queries/{}'.format(query.id), user=self.factory.create_admin())
        self.assertEquals(rv.status_code, 200)


class TestQueryResourcePost(BaseTestCase):
    def test_update_query(self):
        admin = self.factory.create_admin()
        query = self.factory.create_query()

        new_ds = self.factory.create_data_source()
        new_qr = self.factory.create_query_result()

        data = {
            'name': 'Testing',
            'query': 'select 2',
            'latest_query_data_id': new_qr.id,
            'data_source_id': new_ds.id
        }

        rv = self.make_request('post', '/api/queries/{0}'.format(query.id), data=data, user=admin)
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json['name'], data['name'])
        self.assertEqual(rv.json['last_modified_by']['id'], admin.id)
        self.assertEqual(rv.json['query'], data['query'])
        self.assertEqual(rv.json['data_source_id'], data['data_source_id'])
        self.assertEqual(rv.json['latest_query_data_id'], data['latest_query_data_id'])

    def test_raises_error_in_case_of_conflict(self):
        q = self.factory.create_query()
        q.name = "Another Name"
        db.session.add(q)

        rv = self.make_request('post', '/api/queries/{0}'.format(q.id), data={'name': 'Testing', 'version': q.version - 1}, user=self.factory.user)
        self.assertEqual(rv.status_code, 409)

    def test_overrides_existing_if_no_version_specified(self):
        q = self.factory.create_query()
        q.name = "Another Name"
        db.session.add(q)

        rv = self.make_request('post', '/api/queries/{0}'.format(q.id), data={'name': 'Testing'}, user=self.factory.user)
        self.assertEqual(rv.status_code, 200)

    def test_works_for_non_owner_with_permission(self):
        query = self.factory.create_query()
        user = self.factory.create_user()

        rv = self.make_request('post', '/api/queries/{0}'.format(query.id), data={'name': 'Testing'}, user=user)
        self.assertEqual(rv.status_code, 403)

        models.AccessPermission.grant(obj=query, access_type=ACCESS_TYPE_MODIFY, grantee=user, grantor=query.user)

        rv = self.make_request('post', '/api/queries/{0}'.format(query.id), data={'name': 'Testing'}, user=user)
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json['name'], 'Testing')
        self.assertEqual(rv.json['last_modified_by']['id'], user.id)


class TestQueryListResourcePost(BaseTestCase):
    def test_create_query(self):
        query_data = {
            'name': 'Testing',
            'query': 'SELECT 1',
            'schedule': "3600",
            'data_source_id': self.factory.data_source.id
        }

        rv = self.make_request('post', '/api/queries', data=query_data)

        self.assertEquals(rv.status_code, 200)
        self.assertDictContainsSubset(query_data, rv.json)
        self.assertEquals(rv.json['user']['id'], self.factory.user.id)
        self.assertIsNotNone(rv.json['api_key'])
        self.assertIsNotNone(rv.json['query_hash'])

        query = models.Query.query.get(rv.json['id'])
        self.assertEquals(len(list(query.visualizations)), 1)
        self.assertTrue(query.is_draft)


class QueryRefreshTest(BaseTestCase):
    def setUp(self):
        super(QueryRefreshTest, self).setUp()

        self.query = self.factory.create_query()
        self.path = '/api/queries/{}/refresh'.format(self.query.id)

    def test_refresh_regular_query(self):
        response = self.make_request('post', self.path)
        self.assertEqual(200, response.status_code)

    def test_refresh_of_query_with_parameters(self):
        self.query.query_text = u"SELECT {{param}}"
        db.session.add(self.query)

        response = self.make_request('post', "{}?p_param=1".format(self.path))
        self.assertEqual(200, response.status_code)

    def test_refresh_of_query_with_parameters_without_parameters(self):
        self.query.query_text = u"SELECT {{param}}"
        db.session.add(self.query)

        response = self.make_request('post', "{}".format(self.path))
        self.assertEqual(400, response.status_code)

    def test_refresh_query_you_dont_have_access_to(self):
        group = self.factory.create_group()
        db.session.add(group)
        db.session.commit()
        user = self.factory.create_user(group_ids=[group.id])
        response = self.make_request('post', self.path, user=user)
        self.assertEqual(403, response.status_code)
