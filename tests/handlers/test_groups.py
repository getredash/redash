from tests import BaseTestCase
from tests.factories import org_factory
from redash.models import Group, DataSource


class TestGroupDataSourceListResource(BaseTestCase):
    def test_returns_only_groups_for_current_org(self):
        group = self.factory.create_group(org=self.factory.create_org())
        data_source = self.factory.create_data_source(group=group)

        response = self.make_request('get', '/api/groups/{}/data_sources'.format(group.id), user=self.factory.create_admin())
        self.assertEqual(response.status_code, 404)


class TestGroupResourcePost(BaseTestCase):
    def test_doesnt_change_builtin_groups(self):
        current_name = self.factory.default_group.name

        response = self.make_request('post', '/api/groups/{}'.format(self.factory.default_group.id),
                                     user=self.factory.create_admin(),
                                     data={'name': 'Another Name'})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(current_name, Group.get_by_id(self.factory.default_group.id).name)


class TestGroupResourceDelete(BaseTestCase):
    def test_allowed_only_to_admin(self):
        group = self.factory.create_group()

        response = self.make_request('delete', '/api/groups/{}'.format(group.id))
        self.assertEqual(response.status_code, 403)

        response = self.make_request('delete', '/api/groups/{}'.format(group.id), user=self.factory.create_admin())
        self.assertEqual(response.status_code, 200)

        self.assertRaises(Group.DoesNotExist, Group.get_by_id, group.id)

    def test_cant_delete_builtin_group(self):
        for group in [self.factory.default_group, self.factory.admin_group]:
            response = self.make_request('delete', '/api/groups/{}'.format(group.id), user=self.factory.create_admin())
            self.assertEqual(response.status_code, 400)

    def test_can_delete_group_with_data_sources(self):
        group = self.factory.create_group()
        data_source = self.factory.create_data_source(group=group)

        response = self.make_request('delete', '/api/groups/{}'.format(group.id), user=self.factory.create_admin())

        self.assertEqual(response.status_code, 200)

        self.assertEqual(data_source, DataSource.get_by_id(data_source.id))
