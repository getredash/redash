import json
from tests import BaseTestCase
from redash.models import DataSource


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
        self.factory.user.groups.append(group.id)
        self.factory.user.save()
        self.factory.data_source.add_group(group)
        self.factory.data_source.add_group(self.factory.org.default_group)
        response = self.make_request("get", "/api/data_sources", user=self.factory.user)

        self.assertEqual(len(response.json), 1)


class DataSourceTypesTest(BaseTestCase):
    def test_returns_data_for_admin(self):
        admin = self.factory.create_admin()
        rv = self.make_request('get', "/api/data_sources/types", user=admin)
        self.assertEqual(rv.status_code, 200)

    def test_returns_403_for_non_admin(self):
        rv = self.make_request('get', "/api/data_sources/types")
        self.assertEqual(rv.status_code, 403)


class TestDataSourceAPIPost(BaseTestCase):
    def setUp(self):
        super(TestDataSourceAPIPost, self).setUp()
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
        data_source = DataSource.get_by_id(self.factory.data_source.id)

        self.assertEqual(data_source.name, new_name)
        self.assertEqual(data_source.options.to_dict(), new_options)


class TestDataSourceListAPIPost(BaseTestCase):
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
