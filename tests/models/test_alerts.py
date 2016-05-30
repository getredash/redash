from tests import BaseTestCase
from redash.models import Alert


class TestAlertAll(BaseTestCase):
    def test_returns_all_alerts_for_given_groups(self):
        ds1 = self.factory.data_source
        group = self.factory.create_group()
        ds2 = self.factory.create_data_source(group=group)

        query1 = self.factory.create_query(data_source=ds1)
        query2 = self.factory.create_query(data_source=ds2)

        alert1 = self.factory.create_alert(query=query1)
        alert2 = self.factory.create_alert(query=query2)

        alerts = Alert.all(groups=[group, self.factory.default_group])
        self.assertIn(alert1, alerts)
        self.assertIn(alert2, alerts)

        alerts = Alert.all(groups=[self.factory.default_group])
        self.assertIn(alert1, alerts)
        self.assertNotIn(alert2, alerts)

        alerts = Alert.all(groups=[group])
        self.assertNotIn(alert1, alerts)
        self.assertIn(alert2, alerts)

    def test_return_each_alert_only_once(self):
        group = self.factory.create_group()
        self.factory.data_source.add_group(group)

        alert = self.factory.create_alert()

        alerts = Alert.all(groups=[self.factory.default_group, group])
        self.assertEqual(1, len(list(alerts)))
        self.assertIn(alert, alerts)
