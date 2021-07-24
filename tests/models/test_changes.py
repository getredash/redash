from tests import BaseTestCase

from redash.models import db, Query, Change, ChangeTrackingMixin


def create_object(factory):
    obj = Query(
        name="Query",
        description="",
        query_text="SELECT 1",
        user=factory.user,
        data_source=factory.data_source,
        org=factory.org,
    )

    return obj


class TestChangesProperty(BaseTestCase):
    def test_returns_initial_state(self):
        obj = create_object(self.factory)

        for change in Change.query.filter(Change.object == obj):
            self.assertIsNone(change.change["previous"])


class TestLogChange(BaseTestCase):
    def obj(self):
        obj = Query(
            name="Query",
            description="",
            query_text="SELECT 1",
            user=self.factory.user,
            data_source=self.factory.data_source,
            org=self.factory.org,
        )

        return obj

    def test_properly_logs_first_creation(self):
        obj = create_object(self.factory)
        obj.record_changes(changed_by=self.factory.user)
        change = Change.last_change(obj)

        self.assertIsNotNone(change)
        self.assertEqual(change.object_version, 1)

    def test_skips_unnecessary_fields(self):
        obj = create_object(self.factory)
        obj.record_changes(changed_by=self.factory.user)
        change = Change.last_change(obj)

        self.assertIsNotNone(change)
        self.assertEqual(change.object_version, 1)
        for field in ChangeTrackingMixin.skipped_fields:
            self.assertNotIn(field, change.change)

    def test_properly_log_modification(self):
        obj = create_object(self.factory)
        obj.record_changes(changed_by=self.factory.user)
        obj.name = "Query 2"
        obj.description = "description"
        db.session.flush()
        obj.record_changes(changed_by=self.factory.user)

        change = Change.last_change(obj)

        self.assertIsNotNone(change)
        # TODO: https://github.com/getredash/redash/issues/1550
        # self.assertEqual(change.object_version, 2)
        self.assertEqual(change.object_version, obj.version)
        self.assertIn("name", change.change)
        self.assertIn("description", change.change)

    def test_logs_create_method(self):
        q = Query(
            name="Query",
            description="",
            query_text="",
            user=self.factory.user,
            data_source=self.factory.data_source,
            org=self.factory.org,
        )
        change = Change.last_change(q)

        self.assertIsNotNone(change)
        self.assertEqual(q.user, change.user)
