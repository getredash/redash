from tests import BaseTestCase
from redash.models import db, Change


class TestChangesGet(BaseTestCase):
    def setUp(self):
        super().setUp()

        query = self.factory.create_query()
        query.record_changes(self.factory.user, Change.Type.Created)
        query.query_text = "SELECT 'test'"
        query.record_changes(self.factory.user, Change.Type.Modified)
        query.name = "Test Query"
        query.record_changes(self.factory.user, Change.Type.Modified)
        db.session.commit()

        widget = self.factory.create_widget()
        dashboard = widget.dashboard
        dashboard.record_changes(self.factory.user, Change.Type.Created)
        widget.record_changes(self.factory.user, Change.Type.Created)
        dashboard.name = "Test Dashboard"
        dashboard.record_changes(self.factory.user, Change.Type.Modified)
        widget.visualization_id = None
        widget.text = "Text of widget"
        widget.record_changes(self.factory.user, Change.Type.Modified)
        db.session.commit()

        self._objects = (query, dashboard, widget)

    def _assert_changes_structure(self, changes, expected_count=None):
        if expected_count is not None:
            self.assertEquals(len(changes), expected_count, "Expected %i items" % expected_count)
        expected_keys = {
            "created_at", "object_type", "object_id", "target_type", "target_id", "change_type", "changes",
        }
        for c in changes:
            keys = set(c.keys())
            self.assertTrue(expected_keys.issubset(keys), "Change structure mismatch")
            self.assertIsInstance(c["changes"], dict, "Change structure mismatch")

    def _assert_changes_ownership(self, changes, refs):
        for c in changes:
            ref = (c["object_type"], c["object_id"], c["target_type"], c["target_id"])
            self.assertTrue(ref in refs, "Change does not belong to any of specified objects")

    def test_get_all_changes(self):
        query, dashboard, widget = self._objects
        rv = self.make_request("get", "/api/changes")
        self.assertEqual(rv.status_code, 200)

        changes = rv.json["results"]
        self._assert_changes_structure(changes, expected_count=7)
        self._assert_changes_ownership(changes, {
            (query.__table__.name, query.id, query.__table__.name, query.id),
            (dashboard.__table__.name, dashboard.id, dashboard.__table__.name, dashboard.id),
            (dashboard.__table__.name, dashboard.id, widget.__table__.name, widget.id),
        })

    def test_get_all_changes_for_object(self):
        query, dashboard, widget = self._objects
        rv = self.make_request("get", "/api/queries/{0}/changes".format(query.id))
        self.assertEqual(rv.status_code, 200)

        changes = rv.json["results"]
        self._assert_changes_structure(changes, expected_count=3)
        self._assert_changes_ownership(changes, {
            (query.__table__.name, query.id, query.__table__.name, query.id),
        })

    def test_get_all_changes_for_object_with_relations(self):
        query, dashboard, widget = self._objects
        rv = self.make_request("get", "/api/dashboards/{0}/changes".format(dashboard.id))
        self.assertEqual(rv.status_code, 200)

        changes = rv.json["results"]
        self._assert_changes_structure(changes, expected_count=4)
        self._assert_changes_ownership(changes, {
            (dashboard.__table__.name, dashboard.id, dashboard.__table__.name, dashboard.id),
            (dashboard.__table__.name, dashboard.id, widget.__table__.name, widget.id),
        })
