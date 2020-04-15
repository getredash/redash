from tests import BaseTestCase

from redash.models import db, Change


class BaseChangeTestCase(BaseTestCase):
    # updates an object and returns changes in the same form as they're stored in DB
    def _update_object(self, obj, new_values):
        result = {}
        for key, new_value in new_values.items():
            old_value = getattr(obj, key, None)
            setattr(obj, key, new_value)
            if old_value == new_value:
                result[key] = [new_value]
            else:
                result[key] = [old_value, new_value]
        return result

    def _record_changes(self, obj, change_type=Change.Type.Modified):
        obj.record_changes(self.factory.user, change_type)
        db.session.commit()

    def _get_changes_by_object(self, obj, expected_count=None):
        changes = list(Change.get_by_object(obj, self.factory.org))
        if expected_count is not None:
            self.assertEquals(len(changes), expected_count, "Expected %i change(s)" % expected_count)
        return changes

    def _assert_change_ownership(self, change, target, parent):
        if parent:
            self.assertEquals(change.object_type, parent.__table__.name, "Parent reference mismatch")
            self.assertEquals(change.object_id, parent.id, "Parent reference mismatch")

        if target:
            self.assertEquals(change.change["object_type"], target.__table__.name, "Target reference mismatch")
            self.assertEquals(change.change["object_id"], target.id, "Target reference mismatch")

    def _test_creation(self, target, parent):
        self._record_changes(target, Change.Type.Created)

        changes = self._get_changes_by_object(parent, expected_count=1)
        change = changes[0]
        self._assert_change_ownership(change, target, parent)

        self.assertTrue(change.change["changes"], "There should be some changes")

    def _test_modification(self, target, parent, new_values):
        target.clear_detected_changes()

        updates = self._update_object(target, new_values)
        self._record_changes(target, Change.Type.Modified)

        changes = self._get_changes_by_object(parent, expected_count=1)
        change = changes[0]
        self._assert_change_ownership(change, target, parent)

        # this will also check if only modified fields were stored to DB
        self.assertDictEqual(change.change["changes"], updates)

    def _test_deletion(self, target, parent):
        target.clear_detected_changes()

        self._record_changes(target, Change.Type.Deleted)

        changes = self._get_changes_by_object(parent, expected_count=1)
        change = changes[0]
        self._assert_change_ownership(change, target, parent)

        # when deleting an object, no changes are logged, just a fact of deletion
        self.assertDictEqual(change.change["changes"], {})


class TestQueryChanges(BaseChangeTestCase):
    def test_creation(self):
        query = self.factory.create_query()
        self._test_creation(query, query)

    def test_modification(self):
        query = self.factory.create_query()
        self._test_modification(query, query, {"name": "New Name"})

    def test_deletion(self):
        query = self.factory.create_query()
        self._test_deletion(query, query)


class TestVisualizationChanges(BaseChangeTestCase):
    def test_creation(self):
        visualization = self.factory.create_visualization()
        self._test_creation(visualization, visualization.query_rel)

    def test_modification(self):
        visualization = self.factory.create_visualization()
        self._test_modification(visualization, visualization.query_rel, {"name": "New Name"})

    def test_deletion(self):
        visualization = self.factory.create_visualization()
        self._test_deletion(visualization, visualization.query_rel)


class TestDashboardChanges(BaseChangeTestCase):
    def test_creation(self):
        dashboard = self.factory.create_dashboard()
        self._test_creation(dashboard, dashboard)

    def test_modification(self):
        dashboard = self.factory.create_dashboard()
        self._test_modification(dashboard, dashboard, {"name": "New Name"})

    def test_deletion(self):
        dashboard = self.factory.create_dashboard()
        self._test_deletion(dashboard, dashboard)


class TestWidgetChanges(BaseChangeTestCase):
    def test_creation(self):
        widget = self.factory.create_widget()
        self._test_creation(widget, widget.dashboard)

    def test_modification(self):
        widget = self.factory.create_widget()
        self._test_modification(widget, widget.dashboard, {
            "visualization_id": None,
            "text": "Text of widget"
        })

    def test_deletion(self):
        widget = self.factory.create_widget()
        self._test_deletion(widget, widget.dashboard)


class TestApiKeyChanges(BaseChangeTestCase):
    def test_creation(self):
        dashboard = self.factory.create_dashboard()
        api_key = self.factory.create_api_key(object=dashboard, active=True)
        self._test_creation(api_key, dashboard)

    def test_modification(self):
        dashboard = self.factory.create_dashboard()
        api_key = self.factory.create_api_key(object=dashboard, active=True)
        self._test_modification(api_key, dashboard, {"active": False})

    def test_deletion(self):
        dashboard = self.factory.create_dashboard()
        api_key = self.factory.create_api_key(object=dashboard, active=True)
        self._test_deletion(api_key, dashboard)


class TestNotificationDestinationChanges(BaseChangeTestCase):
    def test_creation(self):
        destination = self.factory.create_destination()
        self._test_creation(destination, destination)

    def test_modification(self):
        destination = self.factory.create_destination()
        self._test_modification(destination, destination, {"name": "New Name"})

    def test_deletion(self):
        destination = self.factory.create_destination()
        self._test_deletion(destination, destination)


class TestAlertChanges(BaseChangeTestCase):
    def test_creation(self):
        alert = self.factory.create_alert()
        self._test_creation(alert, alert)

    def test_modification(self):
        alert = self.factory.create_alert()
        self._test_modification(alert, alert, {"name": "New Name"})

    def test_deletion(self):
        alert = self.factory.create_alert()
        self._test_deletion(alert, alert)


# Alert subscriptions can only be added and removed, so not testing for modifications
class TestAlertSubscriptionChanges(BaseChangeTestCase):
    def test_creation(self):
        alert = self.factory.create_alert()
        subscription = self.factory.create_alert_subscription(alert=alert)
        self._test_creation(subscription, alert)

    def test_deletion(self):
        alert = self.factory.create_alert()
        subscription = self.factory.create_alert_subscription(alert=alert)
        self._test_deletion(subscription, alert)
