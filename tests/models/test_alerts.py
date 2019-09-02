from tests import BaseTestCase
from redash.models import Alert, db
from redash.utils import json_dumps


class TestAlertAll(BaseTestCase):
    def test_returns_all_alerts_for_given_groups(self):
        ds1 = self.factory.data_source
        group = self.factory.create_group()
        ds2 = self.factory.create_data_source(group=group)

        query1 = self.factory.create_query(data_source=ds1)
        query2 = self.factory.create_query(data_source=ds2)

        alert1 = self.factory.create_alert(query_rel=query1)
        alert2 = self.factory.create_alert(query_rel=query2)
        db.session.flush()

        alerts = Alert.all(group_ids=[group.id, self.factory.default_group.id])
        self.assertIn(alert1, alerts)
        self.assertIn(alert2, alerts)

        alerts = Alert.all(group_ids=[self.factory.default_group.id])
        self.assertIn(alert1, alerts)
        self.assertNotIn(alert2, alerts)

        alerts = Alert.all(group_ids=[group.id])
        self.assertNotIn(alert1, alerts)
        self.assertIn(alert2, alerts)

    def test_return_each_alert_only_once(self):
        group = self.factory.create_group()
        self.factory.data_source.add_group(group)

        alert = self.factory.create_alert()

        alerts = Alert.all(group_ids=[self.factory.default_group.id, group.id])
        self.assertEqual(1, len(list(alerts)))
        self.assertIn(alert, alerts)


def get_results(value):
    return json_dumps({'rows': [{'foo': value}], 'columns': [{'name': 'foo', 'type': 'STRING'}]})


class TestAlertEvaluate(BaseTestCase):
    def create_alert(self, results, column='foo'):
        result = self.factory.create_query_result(data=results)
        query = self.factory.create_query(latest_query_data_id=result.id)
        alert = self.factory.create_alert(query_rel=query, options={'op': 'equals', 'column': column, 'value': 1})
        return alert

    def test_evaluate_triggers_alert_when_equal(self):
        alert = self.create_alert(get_results(1))
        self.assertEqual(alert.evaluate(), Alert.TRIGGERED_STATE)

    def test_evaluate_return_unknown_when_missing_column(self):
        alert = self.create_alert(get_results(1), column='bar')
        self.assertEqual(alert.evaluate(), Alert.UNKNOWN_STATE)

    def test_evaluate_return_unknown_when_empty_results(self):
        results = json_dumps({'rows': [], 'columns': [{'name': 'foo', 'type': 'STRING'}]})
        alert = self.create_alert(results)
        self.assertEqual(alert.evaluate(), Alert.UNKNOWN_STATE)