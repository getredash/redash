from funcy import project

from redash.models import DataSource, Group, db
from tests import BaseTestCase


class TestGroupDataSourceListResource(BaseTestCase):
    def test_returns_only_groups_for_current_org(self):
        group = self.factory.create_group(org=self.factory.create_org())
        self.factory.create_data_source(group=group)
        db.session.flush()
        response = self.make_request(
            "get",
            "/api/groups/{}/data_sources".format(group.id),
            user=self.factory.create_admin(),
        )
        self.assertEqual(response.status_code, 404)

    def test_list(self):
        group = self.factory.create_group()
        ds = self.factory.create_data_source(group=group)
        db.session.flush()
        response = self.make_request(
            "get",
            "/api/groups/{}/data_sources".format(group.id),
            user=self.factory.create_admin(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json), 1)
        self.assertEqual(response.json[0]["id"], ds.id)


class TestGroupResourceList(BaseTestCase):
    def test_list_admin(self):
        self.factory.create_group(org=self.factory.create_org())
        response = self.make_request("get", "/api/groups", user=self.factory.create_admin())
        g_keys = ["type", "id", "name", "permissions"]

        def filtergroups(gs):
            return [project(g, g_keys) for g in gs]

        self.assertEqual(
            filtergroups(response.json),
            filtergroups(g.to_dict() for g in [self.factory.admin_group, self.factory.default_group]),
        )

    def test_list(self):
        group1 = self.factory.create_group(org=self.factory.create_org(), permissions=["view_dashboard"])
        db.session.flush()
        u = self.factory.create_user(group_ids=[self.factory.default_group.id, group1.id])
        db.session.flush()
        response = self.make_request("get", "/api/groups", user=u)
        g_keys = ["type", "id", "name", "permissions"]

        def filtergroups(gs):
            return [project(g, g_keys) for g in gs]

        self.assertEqual(
            filtergroups(response.json),
            filtergroups(g.to_dict() for g in [self.factory.default_group, group1]),
        )


class TestGroupResourcePost(BaseTestCase):
    def test_doesnt_change_builtin_groups(self):
        current_name = self.factory.default_group.name

        response = self.make_request(
            "post",
            "/api/groups/{}".format(self.factory.default_group.id),
            user=self.factory.create_admin(),
            data={"name": "Another Name"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(current_name, Group.query.get(self.factory.default_group.id).name)


class TestGroupResourceDelete(BaseTestCase):
    def test_allowed_only_to_admin(self):
        group = self.factory.create_group()

        response = self.make_request("delete", "/api/groups/{}".format(group.id))
        self.assertEqual(response.status_code, 403)

        response = self.make_request(
            "delete",
            "/api/groups/{}".format(group.id),
            user=self.factory.create_admin(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(Group.query.get(group.id))

    def test_cant_delete_builtin_group(self):
        for group in [self.factory.default_group, self.factory.admin_group]:
            response = self.make_request(
                "delete",
                "/api/groups/{}".format(group.id),
                user=self.factory.create_admin(),
            )
            self.assertEqual(response.status_code, 400)

    def test_can_delete_group_with_data_sources(self):
        group = self.factory.create_group()
        data_source = self.factory.create_data_source(group=group)

        response = self.make_request(
            "delete",
            "/api/groups/{}".format(group.id),
            user=self.factory.create_admin(),
        )

        self.assertEqual(response.status_code, 200)

        self.assertEqual(data_source, DataSource.query.get(data_source.id))


class TestGroupResourceGet(BaseTestCase):
    def test_returns_group(self):
        rv = self.make_request("get", "/api/groups/{}".format(self.factory.default_group.id))
        self.assertEqual(rv.status_code, 200)

    def test_doesnt_return_if_user_not_member_or_admin(self):
        rv = self.make_request("get", "/api/groups/{}".format(self.factory.admin_group.id))
        self.assertEqual(rv.status_code, 403)
