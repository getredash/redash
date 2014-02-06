from contextlib import contextmanager
import json
from tests import BaseTestCase
from tests.factories import dashboard_factory, widget_factory, visualization_factory, query_factory
from redash import app, models
from redash.utils import json_dumps


@contextmanager
def authenticated_user(c, user='test@example.com', name='John Test'):
    with c.session_transaction() as sess:
        sess['openid'] = {'email': user, 'name': name}

    yield


def json_request(method, path, data=None):
    if data:
        response = method(path, data=json_dumps(data))
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
        d1 = dashboard_factory.create()
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
        d = dashboard_factory.create()
        new_name = 'New Name'
        with app.test_client() as c, authenticated_user(c):
            rv = json_request(c.post, '/api/dashboards/{0}'.format(d.id),
                              data={'name': new_name, 'layout': '[]'})
            self.assertEquals(rv.status_code, 200)
            self.assertEquals(rv.json['name'], new_name)

    def test_delete_dashboard(self):
        d = dashboard_factory.create()
        with app.test_client() as c, authenticated_user(c):
            rv = json_request(c.delete, '/api/dashboards/{0}'.format(d.slug))
            self.assertEquals(rv.status_code, 200)

            d = models.Dashboard.get_by_slug(d.slug)
            self.assertTrue(d.is_archived)


class WidgetAPITest(BaseTestCase):
    def create_widget(self, dashboard, visualization, width=1):
        data = {
            'visualization_id': visualization.id,
            'dashboard_id': dashboard.id,
            'options': {},
            'width': width
        }

        with app.test_client() as c, authenticated_user(c):
            rv = json_request(c.post, '/api/widgets', data=data)

        return rv

    def test_create_widget(self):
        dashboard = dashboard_factory.create()
        vis = visualization_factory.create()

        rv = self.create_widget(dashboard, vis)
        self.assertEquals(rv.status_code, 200)

        dashboard = models.Dashboard.get(models.Dashboard.id == dashboard.id)
        self.assertEquals(unicode(rv.json['layout']), dashboard.layout)

        self.assertEquals(dashboard.widgets, 1)
        self.assertEquals(rv.json['layout'], [[rv.json['widget']['id']]])
        self.assertEquals(rv.json['new_row'], True)

        rv2 = self.create_widget(dashboard, vis)
        self.assertEquals(dashboard.widgets, 2)
        self.assertEquals(rv2.json['layout'],
                          [[rv.json['widget']['id'], rv2.json['widget']['id']]])
        self.assertEquals(rv2.json['new_row'], False)

        rv3 = self.create_widget(dashboard, vis)
        self.assertEquals(rv3.json['new_row'], True)
        rv4 = self.create_widget(dashboard, vis, width=2)
        self.assertEquals(rv4.json['layout'],
                          [[rv.json['widget']['id'], rv2.json['widget']['id']],
                           [rv3.json['widget']['id']],
                           [rv4.json['widget']['id']]])
        self.assertEquals(rv4.json['new_row'], True)

    def test_delete_widget(self):
        widget = widget_factory.create()

        with app.test_client() as c, authenticated_user(c):
            rv = json_request(c.delete, '/api/widgets/{0}'.format(widget.id))

            self.assertEquals(rv.status_code, 200)
            dashboard = models.Dashboard.get_by_slug(widget.dashboard.slug)
            self.assertEquals(dashboard.widgets.count(), 0)
            self.assertEquals(dashboard.layout, '[]')

            # TODO: test how it updates the layout


class QueryAPITest(BaseTestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = ['/api/queries']
        super(QueryAPITest, self).setUp()

    def test_update_query(self):
        query = query_factory.create()

        with app.test_client() as c, authenticated_user(c):
            rv = json_request(c.post, '/api/queries/{0}'.format(query.id), data={'name': 'Testing'})
            self.assertEqual(rv.status_code, 200)
            self.assertEquals(rv.json['name'], 'Testing')

    def test_create_query(self):
        user = 'test@everything.me'
        query_data = {
            'name': 'Testing',
            'description': 'Description',
            'query': 'SELECT 1',
            'ttl': 3600
        }

        with app.test_client() as c, authenticated_user(c, user=user):
            rv = json_request(c.post, '/api/queries', data=query_data)

            self.assertEquals(rv.status_code, 200)
            self.assertDictContainsSubset(query_data, rv.json)
            self.assertEquals(rv.json['user'], user)
            self.assertIsNotNone(rv.json['api_key'])
            self.assertIsNotNone(rv.json['query_hash'])

    def test_get_query(self):
        query = query_factory.create()

        with app.test_client() as c, authenticated_user(c):
            rv = json_request(c.get, '/api/queries/{0}'.format(query.id))

            self.assertEquals(rv.status_code, 200)
            d = query.to_dict(with_visualizations=True)
            d.pop('created_at')
            self.assertDictContainsSubset(d, rv.json)

    def test_get_all_queries(self):
        queries = [query_factory.create() for _ in range(10)]

        with app.test_client() as c, authenticated_user(c):
            rv = json_request(c.get, '/api/queries')

            self.assertEquals(rv.status_code, 200)
            self.assertEquals(len(rv.json), 10)



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