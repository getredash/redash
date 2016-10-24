from redash import models
from tests import BaseTestCase
from tests.test_handlers import AuthenticationTestMixin


class QueryAccessPermissionsTest(BaseTestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = ['/api/queries/1/acl']
        super(QueryAccessPermissionsTest, self).setUp()

    def test_check_access(self):
        admin = self.factory.create_admin()
        user = self.factory.create_user()
        query = self.factory.create_query()

        object_id = query.id
        object_type = models.Query.__name__
        access_type = models.AccessPermission.ACCESS_TYPE_MODIFY

        rv = self.make_request('get', '/api/queries/%s/acl' % object_id, user=admin)
        self.assertEquals(rv.status_code, 200)
        self.assertEquals(len(rv.json), 0)

        rv = self.make_request('get', '/api/queries/%s/acl' % object_id, user=user)
        self.assertEquals(rv.status_code, 200)
        self.assertEquals(len(rv.json), 0)

        self.factory.create_access_permission(object_type = object_type, object_id = object_id,
                grantee = user, grantor = admin, access_type = access_type)

        rv = self.make_request('get', '/api/queries/%s/acl' % (object_id), user=admin)
        self.assertEquals(rv.status_code, 200)
        self.assertGreater(len(rv.json[access_type]), 0)

        rv = self.make_request('get', '/api/queries/%s/acl/%s' % (object_id, access_type), user=user)
        self.assertEquals(rv.status_code, 200)

        rv = self.make_request('get', '/api/queries/%s/acl/%s' % (object_id, access_type), user=admin)
        self.assertEquals(rv.status_code, 403)


class TestObjectPermissionsListGet(BaseTestCase):
    # returns empty list when no permissions available
    # returns relevant permissions when they exist
    # returns 404 for users outside of organization
    # returns 404? for users who don't have access to this query
    pass


class TestObjectPermissionsListPost(BaseTestCase):
    # creates permission
    # returns 403 if user isn't owner or admin
    # returns 404 for users outside of organization
    # returns 404? for users who don't have access to this query
    pass


class TestObjectPermissionsListDelete(BaseTestCase):
    # deletes permission
    # deletes permission created by someone else
    # returns 404 for users outside of org
    # returns 404? for users who don't have access to this query
    pass


class TestCheckPermissionsGet(BaseTestCase):
    # returns true for existing,
    # false for not...
    # returns 404 for users outside of org
    # returns 404? for users who don't have access to this query
    pass
