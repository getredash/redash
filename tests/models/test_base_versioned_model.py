import peewee

from mock import patch
from tests import BaseTestCase
from redash.models import ChangeTrackingMixin, BaseVersionedModel, ConflictDetectedError


class TestModel(BaseVersionedModel):
    value = peewee.IntegerField()

    class Meta:
        db_table = 'test_mode'


class TestModelTestCase(BaseTestCase):
    def setUp(self):
        super(TestModelTestCase, self).setUp()
        TestModel.create_table()

    def tearDown(self):
        super(TestModelTestCase, self).tearDown()
        TestModel.drop_table()


class TestBaseVersionedModel(TestModelTestCase):
    def test_creates_first_instance_with_version_0(self):
        t = TestModel(value=123)
        t.save()

        self.assertIsNotNone(t.id)
        self.assertEqual(t.version, 1)
        self.assertEqual(t.value, 123)

    def test_fails_when_there_is_version_conflict(self):
        t = TestModel(value=123)
        t.save()

        t1 = TestModel.get(TestModel.id==t.id)
        t2 = TestModel.get(TestModel.id==t.id)

        t1.value = 124
        t1.save()

        self.assertRaises(ConflictDetectedError, lambda: t2.save())

    def test_calls_save_hooks(self):
        t = TestModel(value=123)

        with patch(__name__ + '.TestModel.pre_save') as pre_save_mock, patch(__name__ + '.TestModel.post_save') as post_save_mock:
            t.save()

            pre_save_mock.assert_called_once_with(True)
            post_save_mock.assert_called_once_with(True)

        t.value = 124
        with patch(__name__ + '.TestModel.pre_save') as pre_save_mock, patch(__name__ + '.TestModel.post_save') as post_save_mock:
            t.save()

            pre_save_mock.assert_called_once_with(False)
            post_save_mock.assert_called_once_with(False)
