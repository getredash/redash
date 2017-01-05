from tests import BaseTestCase
from redash.models import Dashboard, db


class TestApiKeyGetByObject(BaseTestCase):
    def test_returns_none_if_not_exists(self):
        dashboard = self.factory.create_dashboard()
        self.assertIsNone(dashboard.api_key)

    def test_returns_only_active_key(self):
        dashboard = self.factory.create_dashboard()
        api_key = Dashboard.ApiKey(org=self.factory.org, object=dashboard,
                                   created_by=self.factory.user, active=False)
        db.session.add(api_key)
        self.assertIsNone(dashboard.api_key)

        api_key = dashboard.create_api_key(self.factory.user)
        self.assertEqual(api_key, dashboard.api_key)
