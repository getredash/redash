from tests import BaseTestCase
from tests.factories import org_factory
from tests.handlers import make_request


class TestDataSourceGetSchema(BaseTestCase):
    def test_fails_if_user_doesnt_belong_to_org(self):
        other_user = self.factory.create_user(org=self.factory.create_org())
        response = make_request("get", "/api/data_sources/{}/schema".format(self.factory.data_source.id), user=other_user)
        self.assertEqual(response.status_code, 404)

        other_admin = self.factory.create_admin(org=self.factory.create_org())
        response = make_request("get", "/api/data_sources/{}/schema".format(self.factory.data_source.id), user=other_admin)
        self.assertEqual(response.status_code, 404)
