from tests import BaseTestCase
from redash.models import Query
from redash.permissions import ACCESS_TYPE_MODIFY, ACCESS_TYPE_VIEW


class TestAccessPermissionGrant(BaseTestCase):
    def test_creates_correct_object(self):
        q = self.factory.create_query()
        permission = Query.AccessPermission.grant(
            obj=q, access_type=ACCESS_TYPE_MODIFY,
            grantor=self.factory.user, grantee=self.factory.user)

        self.assertEqual(permission.object, q)
        self.assertEqual(permission.grantor, self.factory.user)
        self.assertEqual(permission.grantee, self.factory.user)
        self.assertEqual(permission.access_type, ACCESS_TYPE_MODIFY)

    def test_returns_existing_object_if_exists(self):
        q = self.factory.create_query()
        permission1 = Query.AccessPermission.grant(
            obj=q, access_type=ACCESS_TYPE_MODIFY,
            grantor=self.factory.user, grantee=self.factory.user)

        permission2 = Query.AccessPermission.grant(
            obj=q, access_type=ACCESS_TYPE_MODIFY,
            grantor=self.factory.user, grantee=self.factory.user)

        self.assertEqual(permission1, permission2)


class TestAccessPermissionRevoke(BaseTestCase):
    def test_deletes_nothing_when_no_permission_exists(self):
        q = self.factory.create_query()
        self.assertEqual(0, Query.AccessPermission.revoke(
            q, self.factory.user, ACCESS_TYPE_MODIFY))

    def test_deletes_permission(self):
        q = self.factory.create_query()
        Query.AccessPermission.grant(
            obj=q, access_type=ACCESS_TYPE_MODIFY,
            grantor=self.factory.user, grantee=self.factory.user)
        self.assertEqual(1, Query.AccessPermission.revoke(
            q, self.factory.user, ACCESS_TYPE_MODIFY))

    def test_deletes_all_permissions_if_no_type_given(self):
        q = self.factory.create_query()

        Query.AccessPermission.grant(
            obj=q, access_type=ACCESS_TYPE_MODIFY,
            grantor=self.factory.user, grantee=self.factory.user)

        Query.AccessPermission.grant(
            obj=q, access_type=ACCESS_TYPE_VIEW,
            grantor=self.factory.user, grantee=self.factory.user)

        self.assertEqual(2,
                         Query.AccessPermission.revoke(q, self.factory.user))


class TestAccessPermissionFind(BaseTestCase):
    pass


class TestAccessPermissionExists(BaseTestCase):
    pass
