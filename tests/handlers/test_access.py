from redash import models
from tests import BaseTestCase
from tests.test_handlers import AuthenticationTestMixin

class QueryAccessPermissionsTest(BaseTestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = ['/api/access/Query/1']
        super(QueryAccessPermissionsTest, self).setUp()

    def test_check_access(self):
        admin = self.factory.create_admin()
        user = self.factory.create_user()
        query = self.factory.create_query()

        object_id = query.id
        object_type = models.Query.__name__
        access_type = models.AccessPermission.ACCESS_TYPE_MODIFY

        rv = self.make_request('get', '/api/access/Query/%s' % object_id, user=admin)
        assert(rv.status_code == 200)
        assert(len(rv.json) == 0)

        rv = self.make_request('get', '/api/access/Query/%s' % object_id, user=user)
        assert(rv.status_code == 200)
        assert(len(rv.json) == 0)

        self.factory.create_access_permission(object_type = object_type, object_id = object_id,
                grantee = user, grantor = admin, access_type = access_type)

        rv = self.make_request('get', '/api/access/%s/%s' % (object_type, object_id), user=admin)
        assert(rv.status_code == 200)
        assert(len(rv.json[access_type]) > 0)

        rv = self.make_request('post', '/api/access/%s/%s/%s' % (object_type, object_id, access_type), user=user)
        assert(rv.status_code == 200)

        rv = self.make_request('post', '/api/access/%s/%s/%s' % (object_type, object_id, access_type), user=admin)
        assert(rv.status_code == 403)
