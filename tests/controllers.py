from contextlib import contextmanager
import unittest
from redash import app


@contextmanager
def authenticated_user(c):
    with c.session_transaction() as sess:
        sess['openid'] = {'email': 'test@example.com', 'name': 'John Test'}

    yield


class AuthenticationTestMixin():
    def test_redirects_when_not_authenticated(self):
        with app.test_client() as c:
            for path in self.paths:
                rv = c.get(path)
                self.assertEquals(302, rv.status_code)

    def test_returns_content_when_authenticated(self):
        with app.test_client() as c:
            with authenticated_user(c):
                for path in self.paths:
                    rv = c.get(path)
                    self.assertEquals(200, rv.status_code)


class PingTest(unittest.TestCase):
    def test_ping(self):
        with app.test_client() as c:
            rv = c.get('/ping')
            self.assertEquals(200, rv.status_code)
            self.assertEquals('PONG.', rv.data)


class IndexTest(unittest.TestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = ['/', '/dashboard/example', '/queries/1', '/admin/status']


class StatusTest(unittest.TestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = ['/status.json']


class DashboardAPITest(unittest.TestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = ['/api/dashboards']


class QueryAPITest(unittest.TestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = ['/api/queries']


class QueryResultAPITest(unittest.TestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = []


class JobAPITest(unittest.TestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = []


class CsvQueryResultAPITest(unittest.TestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = []