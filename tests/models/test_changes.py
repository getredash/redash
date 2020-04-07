from tests import BaseTestCase

from redash.models import db, Query, Change


def create_object(factory):
    obj = Query(
        name="Query",
        description="",
        query_text="SELECT 1",
        user=factory.user,
        data_source=factory.data_source,
        org=factory.org,
    )
    db.session.add(obj)
    db.session.commit()

    return obj


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

    def test_logs_creation(self):
        obj = create_object(self.factory)
        obj.record_changes(self.factory.user, Change.Type.Created)
        db.session.commit()
        change = Change.last_change(obj)

        self.assertIsNotNone(change)
        self.assertEqual(change.change["change_type"], Change.Type.Created)

    def test_logs_modification(self):
        obj = create_object(self.factory)
        obj.record_changes(self.factory.user)
        db.session.commit()
        change = Change.last_change(obj)

        self.assertIsNotNone(change)
        self.assertEqual(change.change["change_type"], Change.Type.Modified)

    def _test_skips_unnecessary_fields(self):
        obj = create_object(self.factory)
        obj.record_changes(changed_by=self.factory.user)
        db.session.commit()
        change = Change.last_change(obj)

        self.assertIsNotNone(change)
        self.assertEqual(change.object_version, 1)
        # for field in ChangeTrackingMixin.skipped_fields:
        #     self.assertNotIn(field, change.change)

    def _test_properly_log_modification(self):
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
