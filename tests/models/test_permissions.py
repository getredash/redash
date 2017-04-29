from tests import BaseTestCase
from redash.models import AccessPermission
from redash.permissions import ACCESS_TYPE_MODIFY, ACCESS_TYPE_VIEW


class TestAccessPermissionGrant(BaseTestCase):
    def test_creates_correct_object(self):
        q = self.factory.create_query()
        permission = AccessPermission.grant(obj=q, access_type=ACCESS_TYPE_MODIFY,
                                            grantor=self.factory.user,
                                            grantee=self.factory.user)

        self.assertEqual(permission.object, q)
        self.assertEqual(permission.grantor, self.factory.user)
        self.assertEqual(permission.grantee, self.factory.user)
        self.assertEqual(permission.access_type, ACCESS_TYPE_MODIFY)

    def test_returns_existing_object_if_exists(self):
        q = self.factory.create_query()
        permission1 = AccessPermission.grant(obj=q, access_type=ACCESS_TYPE_MODIFY,
                                            grantor=self.factory.user,
                                            grantee=self.factory.user)

        permission2 = AccessPermission.grant(obj=q, access_type=ACCESS_TYPE_MODIFY,
                                            grantor=self.factory.user,
                                            grantee=self.factory.user)

        self.assertEqual(permission1.id, permission2.id)


class TestAccessPermissionRevoke(BaseTestCase):
    def test_deletes_nothing_when_no_permission_exists(self):
        q = self.factory.create_query()
        self.assertEqual(0, AccessPermission.revoke(q, self.factory.user, ACCESS_TYPE_MODIFY))

    def test_deletes_permission(self):
        q = self.factory.create_query()
        permission = AccessPermission.grant(obj=q, access_type=ACCESS_TYPE_MODIFY,
                                            grantor=self.factory.user,
                                            grantee=self.factory.user)
        self.assertEqual(1, AccessPermission.revoke(q, self.factory.user, ACCESS_TYPE_MODIFY))

    def test_deletes_all_permissions_if_no_type_given(self):
        q = self.factory.create_query()

        permission = AccessPermission.grant(obj=q, access_type=ACCESS_TYPE_MODIFY,
                                            grantor=self.factory.user,
                                            grantee=self.factory.user)

        permission = AccessPermission.grant(obj=q, access_type=ACCESS_TYPE_VIEW,
                                            grantor=self.factory.user,
                                            grantee=self.factory.user)

        self.assertEqual(2, AccessPermission.revoke(q, self.factory.user))


class TestAccessPermissionFind(BaseTestCase):
    pass


class TestAccessPermissionExists(BaseTestCase):
    pass
