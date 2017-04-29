import json

from funcy import pairwise

from tests import BaseTestCase
from redash.models import DataSource, Query


class TestDataSourceGetSchema(BaseTestCase):
    def test_fails_if_user_doesnt_belong_to_org(self):
        other_user = self.factory.create_user(org=self.factory.create_org())
        response = self.make_request("get", "/api/data_sources/{}/schema".format(self.factory.data_source.id), user=other_user)
        self.assertEqual(response.status_code, 404)

        other_admin = self.factory.create_admin(org=self.factory.create_org())
        response = self.make_request("get", "/api/data_sources/{}/schema".format(self.factory.data_source.id), user=other_admin)
        self.assertEqual(response.status_code, 404)


class TestDataSourceListGet(BaseTestCase):
    def test_returns_each_data_source_once(self):
        group = self.factory.create_group()
        self.factory.user.group_ids.append(group.id)
        self.factory.data_source.add_group(group)
        self.factory.data_source.add_group(self.factory.org.default_group)
        response = self.make_request("get", "/api/data_sources", user=self.factory.user)

        self.assertEqual(len(response.json), 1)

    def test_returns_data_sources_ordered_by_id(self):
        self.factory.create_data_source(group=self.factory.org.default_group)
        self.factory.create_data_source(group=self.factory.org.default_group)
        response = self.make_request("get", "/api/data_sources", user=self.factory.user)
        self.assertTrue(all(left <= right for left, right in pairwise(response.json)))


class DataSourceTypesTest(BaseTestCase):
    def test_returns_data_for_admin(self):
        admin = self.factory.create_admin()
        rv = self.make_request('get', "/api/data_sources/types", user=admin)
        self.assertEqual(rv.status_code, 200)

    def test_returns_403_for_non_admin(self):
        rv = self.make_request('get', "/api/data_sources/types")
        self.assertEqual(rv.status_code, 403)


class TestDataSourceResourcePost(BaseTestCase):
    def setUp(self):
        super(TestDataSourceResourcePost, self).setUp()
        self.path = "/api/data_sources/{}".format(self.factory.data_source.id)

    def test_returns_400_when_configuration_invalid(self):
        admin = self.factory.create_admin()
        rv = self.make_request('post', self.path,
                               data={'name': 'DS 1', 'type': 'pg', 'options': '{}'}, user=admin)

        self.assertEqual(rv.status_code, 400)

    def test_updates_data_source(self):
        admin = self.factory.create_admin()
        new_name = 'New Name'
        new_options = {"dbname": "newdb"}
        rv = self.make_request('post', self.path,
                               data={'name': new_name, 'type': 'pg', 'options': new_options},
                               user=admin)

        self.assertEqual(rv.status_code, 200)
        data_source = DataSource.query.get(self.factory.data_source.id)

        self.assertEqual(data_source.name, new_name)
        self.assertEqual(data_source.options.to_dict(), new_options)


class TestDataSourceResourceDelete(BaseTestCase):
    def test_deletes_the_data_source(self):
        data_source = self.factory.create_data_source()
        admin = self.factory.create_admin()

        rv = self.make_request('delete', '/api/data_sources/{}'.format(data_source.id), user=admin)

        self.assertEqual(204, rv.status_code)
        self.assertIsNone(DataSource.query.get(data_source.id))

    def test_sets_queries_data_source_to_null(self):
        data_source = self.factory.create_data_source()
        admin = self.factory.create_admin()
        query = self.factory.create_query(data_source=data_source)

        rv = self.make_request('delete', '/api/data_sources/{}'.format(data_source.id), user=admin)

        self.assertEqual(204, rv.status_code)
        self.assertIsNone(DataSource.query.get(data_source.id))

        self.assertIsNone(Query.query.get(query.id).data_source_id)

    def test_deletes_child_models(self):
        data_source = self.factory.create_data_source()
        admin = self.factory.create_admin()
        query_result = self.factory.create_query_result(data_source=data_source)

        rv = self.make_request('delete', '/api/data_sources/{}'.format(data_source.id), user=admin)

        self.assertEqual(204, rv.status_code)
        self.assertIsNone(DataSource.query.get(data_source.id))


class TestDataSourceListResourcePost(BaseTestCase):
    def test_returns_400_when_missing_fields(self):
        admin = self.factory.create_admin()
        rv = self.make_request('post', "/api/data_sources", user=admin)
        self.assertEqual(rv.status_code, 400)

        rv = self.make_request('post', "/api/data_sources", data={'name': 'DS 1'}, user=admin)

        self.assertEqual(rv.status_code, 400)

    def test_returns_400_when_configuration_invalid(self):
        admin = self.factory.create_admin()
        rv = self.make_request('post', '/api/data_sources',
                               data={'name': 'DS 1', 'type': 'pg', 'options': '{}'}, user=admin)

        self.assertEqual(rv.status_code, 400)

    def test_creates_data_source(self):
        admin = self.factory.create_admin()
        rv = self.make_request('post', '/api/data_sources',
                               data={'name': 'DS 1', 'type': 'pg', 'options': {"dbname": "redash"}}, user=admin)

        self.assertEqual(rv.status_code, 200)

        self.assertIsNotNone(DataSource.query.get(rv.json['id']))


class TestDataSourcePausePost(BaseTestCase):
    def test_pauses_data_source(self):
        admin = self.factory.create_admin()
        rv = self.make_request('post', '/api/data_sources/{}/pause'.format(self.factory.data_source.id), user=admin)
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(DataSource.query.get(self.factory.data_source.id).paused, True)

    def test_pause_sets_reason(self):
        admin = self.factory.create_admin()
        rv = self.make_request('post', '/api/data_sources/{}/pause'.format(self.factory.data_source.id), user=admin, data={'reason': 'testing'})
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(DataSource.query.get(self.factory.data_source.id).paused, True)
        self.assertEqual(DataSource.query.get(self.factory.data_source.id).pause_reason, 'testing')

        rv = self.make_request('post', '/api/data_sources/{}/pause?reason=test'.format(self.factory.data_source.id), user=admin)
        self.assertEqual(DataSource.query.get(self.factory.data_source.id).pause_reason, 'test')

    def test_requires_admin(self):
        rv = self.make_request('post', '/api/data_sources/{}/pause'.format(self.factory.data_source.id))
        self.assertEqual(rv.status_code, 403)


class TestDataSourcePauseDelete(BaseTestCase):
    def test_resumes_data_source(self):
        admin = self.factory.create_admin()
        self.factory.data_source.pause()
        rv = self.make_request('delete', '/api/data_sources/{}/pause'.format(self.factory.data_source.id), user=admin)
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(DataSource.query.get(self.factory.data_source.id).paused, False)

    def test_requires_admin(self):
        rv = self.make_request('delete', '/api/data_sources/{}/pause'.format(self.factory.data_source.id))
        self.assertEqual(rv.status_code, 403)
