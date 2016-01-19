from tests import BaseTestCase


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

