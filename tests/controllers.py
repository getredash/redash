from contextlib import contextmanager
import json
from tests import BaseTestCase, DashboardFactory
from redash import app, models


@contextmanager
def authenticated_user(c, user='test@example.com', name='John Test'):
    with c.session_transaction() as sess:
        sess['openid'] = {'email': user, 'name': name}

    yield


def json_request(method, path, data=None):
    if data:
        response = method(path, data=json.dumps(data))
    else:
        response = method(path)

    if response.data:
        response.json = json.loads(response.data)
    else:
        response.json = None

    return response


class AuthenticationTestMixin():
    def test_redirects_when_not_authenticated(self):
        with app.test_client() as c:
            for path in self.paths:
                rv = c.get(path)
                self.assertEquals(302, rv.status_code)

    def test_returns_content_when_authenticated(self):
        with app.test_client() as c, authenticated_user(c):
            for path in self.paths:
                rv = c.get(path)
                self.assertEquals(200, rv.status_code)


class PingTest(BaseTestCase):
    def test_ping(self):
        with app.test_client() as c:
            rv = c.get('/ping')
            self.assertEquals(200, rv.status_code)
            self.assertEquals('PONG.', rv.data)


class IndexTest(BaseTestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = ['/', '/dashboard/example', '/queries/1', '/admin/status']
        super(IndexTest, self).setUp()


class StatusTest(BaseTestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = ['/status.json']
        super(StatusTest, self).setUp()


class DashboardAPITest(BaseTestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = ['/api/dashboards']
        super(DashboardAPITest, self).setUp()

    def test_get_dashboard(self):
        d1 = DashboardFactory.create()
        with app.test_client() as c, authenticated_user(c):
            rv = c.get('/api/dashboards/{0}'.format(d1.slug))
            self.assertEquals(rv.status_code, 200)
            self.assertDictEqual(json.loads(rv.data), d1.to_dict(with_widgets=True))

    def test_get_non_existint_dashbaord(self):
        with app.test_client() as c, authenticated_user(c):
            rv = c.get('/api/dashboards/not_existing')
            self.assertEquals(rv.status_code, 404)

    def test_create_new_dashboard(self):
        user_email = 'test@everything.me'
        with app.test_client() as c, authenticated_user(c, user=user_email):
            dashboard_name = 'Test Dashboard'
            rv = json_request(c.post, '/api/dashboards', data={'name': dashboard_name})
            self.assertEquals(rv.status_code, 200)
            self.assertEquals(rv.json['name'], 'Test Dashboard')
            self.assertEquals(rv.json['user'], user_email)
            self.assertEquals(rv.json['layout'], [])

    def test_update_dashboard(self):
        d = DashboardFactory.create()
        new_name = 'New Name'
        with app.test_client() as c, authenticated_user(c):
            rv = json_request(c.post, '/api/dashboards/{0}'.format(d.id),
                              data={'name': new_name, 'layout': '[]'})
            self.assertEquals(rv.status_code, 200)
            self.assertEquals(rv.json['name'], new_name)

    def test_delete_dashbaord(self):
        d = DashboardFactory.create()
        with app.test_client() as c, authenticated_user(c):
            rv = json_request(c.delete, '/api/dashboards/{0}'.format(d.slug))
            self.assertEquals(rv.status_code, 200)

            d = models.Dashboard.get_by_slug(d.slug)
            self.assertTrue(d.is_archived)


class QueryAPITest(BaseTestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = ['/api/queries']
        super(QueryAPITest, self).setUp()


class QueryResultAPITest(BaseTestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = []
        super(QueryResultAPITest, self).setUp()


class JobAPITest(BaseTestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = []
        super(JobAPITest, self).setUp()


class CsvQueryResultAPITest(BaseTestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = []
        super(CsvQueryResultAPITest, self).setUp()