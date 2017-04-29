from funcy import project

from flask import url_for
from flask_login import current_user
from mock import patch
from redash import models, settings
from tests import BaseTestCase
from tests import authenticated_user


class AuthenticationTestMixin(object):
    def test_returns_404_when_not_unauthenticated(self):
        for path in self.paths:
            rv = self.client.get(path)
            self.assertEquals(404, rv.status_code)

    def test_returns_content_when_authenticated(self):
        for path in self.paths:
            rv = self.make_request('get', path, is_json=False)
            self.assertEquals(200, rv.status_code)


class TestAuthentication(BaseTestCase):
    def test_redirects_for_nonsigned_in_user(self):
        rv = self.client.get("/default/")
        self.assertEquals(302, rv.status_code)


class PingTest(BaseTestCase):
    def test_ping(self):
        rv = self.client.get('/ping')
        self.assertEquals(200, rv.status_code)
        self.assertEquals('PONG.', rv.data)


class IndexTest(BaseTestCase):
    def setUp(self):
        self.paths = ['/default/', '/default/dashboard/example', '/default/queries/1', '/default/admin/status']
        super(IndexTest, self).setUp()

    def test_redirect_to_login_when_not_authenticated(self):
        for path in self.paths:
            rv = self.client.get(path)
            self.assertEquals(302, rv.status_code)

    def test_returns_content_when_authenticated(self):
        for path in self.paths:
            rv = self.make_request('get', path, org=False, is_json=False)
            self.assertEquals(200, rv.status_code)


class StatusTest(BaseTestCase):
    def test_returns_data_for_super_admin(self):
        admin = self.factory.create_admin()
        models.db.session.commit()
        rv = self.make_request('get', '/status.json', org=False, user=admin, is_json=False)
        self.assertEqual(rv.status_code, 200)

    def test_returns_403_for_non_admin(self):
        rv = self.make_request('get', '/status.json', org=False, is_json=False)
        self.assertEqual(rv.status_code, 403)

    def test_redirects_non_authenticated_user(self):
        rv = self.client.get('/status.json')
        self.assertEqual(rv.status_code, 302)


class VisualizationResourceTest(BaseTestCase):
    def test_create_visualization(self):
        query = self.factory.create_query()
        models.db.session.commit()
        data = {
            'query_id': query.id,
            'name': 'Chart',
            'description': '',
            'options': {},
            'type': 'CHART'
        }

        rv = self.make_request('post', '/api/visualizations', data=data)

        self.assertEquals(rv.status_code, 200)
        data.pop('query_id')
        self.assertDictContainsSubset(data, rv.json)

    def test_delete_visualization(self):
        visualization = self.factory.create_visualization()
        models.db.session.commit()
        rv = self.make_request('delete', '/api/visualizations/{}'.format(visualization.id))

        self.assertEquals(rv.status_code, 200)
        self.assertEquals(models.db.session.query(models.Visualization).count(), 0)

    def test_update_visualization(self):
        visualization = self.factory.create_visualization()
        models.db.session.commit()
        rv = self.make_request('post', '/api/visualizations/{0}'.format(visualization.id), data={'name': 'After Update'})

        self.assertEquals(rv.status_code, 200)
        self.assertEquals(rv.json['name'], 'After Update')

    def test_only_owner_or_admin_can_create_visualization(self):
        query = self.factory.create_query()
        other_user = self.factory.create_user()
        admin = self.factory.create_admin()
        admin_from_diff_org = self.factory.create_admin(org=self.factory.create_org())
        models.db.session.commit()
        models.db.session.refresh(admin)
        models.db.session.refresh(other_user)
        models.db.session.refresh(admin_from_diff_org)
        data = {
            'query_id': query.id,
            'name': 'Chart',
            'description': '',
            'options': {},
            'type': 'CHART'
        }


        rv = self.make_request('post', '/api/visualizations', data=data, user=admin)
        self.assertEquals(rv.status_code, 200)

        rv = self.make_request('post', '/api/visualizations', data=data, user=other_user)
        self.assertEquals(rv.status_code, 403)

        rv = self.make_request('post', '/api/visualizations', data=data, user=admin_from_diff_org)
        self.assertEquals(rv.status_code, 404)

    def test_only_owner_or_admin_can_edit_visualization(self):
        vis = self.factory.create_visualization()
        models.db.session.flush()
        path = '/api/visualizations/{}'.format(vis.id)
        data = {'name': 'After Update'}

        other_user = self.factory.create_user()
        admin = self.factory.create_admin()
        admin_from_diff_org = self.factory.create_admin(org=self.factory.create_org())
        models.db.session.commit()
        models.db.session.refresh(admin)
        models.db.session.refresh(other_user)
        models.db.session.refresh(admin_from_diff_org)

        rv = self.make_request('post', path, user=admin, data=data)
        self.assertEquals(rv.status_code, 200)

        rv = self.make_request('post', path, user=other_user, data=data)
        self.assertEquals(rv.status_code, 403)

        rv = self.make_request('post', path, user=admin_from_diff_org, data=data)
        self.assertEquals(rv.status_code, 404)

    def test_only_owner_or_admin_can_delete_visualization(self):
        vis = self.factory.create_visualization()
        models.db.session.flush()
        path = '/api/visualizations/{}'.format(vis.id)

        other_user = self.factory.create_user()
        admin = self.factory.create_admin()
        admin_from_diff_org = self.factory.create_admin(org=self.factory.create_org())

        models.db.session.commit()
        models.db.session.refresh(admin)
        models.db.session.refresh(other_user)
        models.db.session.refresh(admin_from_diff_org)
        rv = self.make_request('delete', path, user=admin)
        self.assertEquals(rv.status_code, 200)

        vis = self.factory.create_visualization()
        models.db.session.commit()
        path = '/api/visualizations/{}'.format(vis.id)

        rv = self.make_request('delete', path, user=other_user)
        self.assertEquals(rv.status_code, 403)

        vis = self.factory.create_visualization()
        models.db.session.commit()
        path = '/api/visualizations/{}'.format(vis.id)

        rv = self.make_request('delete', path, user=admin_from_diff_org)
        self.assertEquals(rv.status_code, 404)


class JobAPITest(BaseTestCase, AuthenticationTestMixin):
    def setUp(self):
        self.paths = []
        super(JobAPITest, self).setUp()


class TestLogin(BaseTestCase):
    def setUp(self):
        settings.PASSWORD_LOGIN_ENABLED = True
        super(TestLogin, self).setUp()

    @classmethod
    def setUpClass(cls):
        settings.ORG_RESOLVING = "single_org"

    @classmethod
    def tearDownClass(cls):
        settings.ORG_RESOLVING = "multi_org"

    def test_redirects_to_google_login_if_password_disabled(self):
        with patch.object(settings, 'PASSWORD_LOGIN_ENABLED', False), self.app.test_request_context('/default/login'):
            rv = self.client.get('/default/login')
            self.assertEquals(rv.status_code, 302)
            self.assertTrue(rv.location.endswith(url_for('google_oauth.authorize', next='/default/')))

    def test_get_login_form(self):
        rv = self.client.get('/default/login')
        self.assertEquals(rv.status_code, 200)

    def test_submit_non_existing_user(self):
        with patch('redash.handlers.authentication.login_user') as login_user_mock:
            rv = self.client.post('/default/login', data={'email': 'arik', 'password': 'password'})
            self.assertEquals(rv.status_code, 200)
            self.assertFalse(login_user_mock.called)

    def test_submit_correct_user_and_password(self):
        user = self.factory.user
        user.hash_password('password')

        self.db.session.add(user)
        self.db.session.commit()

        with patch('redash.handlers.authentication.login_user') as login_user_mock:
            rv = self.client.post('/default/login', data={'email': user.email, 'password': 'password'})
            self.assertEquals(rv.status_code, 302)
            login_user_mock.assert_called_with(user, remember=False)

    def test_submit_correct_user_and_password_and_remember_me(self):
        user = self.factory.user
        user.hash_password('password')

        self.db.session.add(user)
        self.db.session.commit()

        with patch('redash.handlers.authentication.login_user') as login_user_mock:
            rv = self.client.post('/default/login', data={'email': user.email, 'password': 'password', 'remember': True})
            self.assertEquals(rv.status_code, 302)
            login_user_mock.assert_called_with(user, remember=True)

    def test_submit_correct_user_and_password_with_next(self):
        user = self.factory.user
        user.hash_password('password')

        self.db.session.add(user)
        self.db.session.commit()

        with patch('redash.handlers.authentication.login_user') as login_user_mock:
            rv = self.client.post('/default/login?next=/test',
                                  data={'email': user.email, 'password': 'password'})
            self.assertEquals(rv.status_code, 302)
            self.assertEquals(rv.location, 'http://localhost/test')
            login_user_mock.assert_called_with(user, remember=False)

    def test_submit_incorrect_user(self):
        with patch('redash.handlers.authentication.login_user') as login_user_mock:
            rv = self.client.post('/default/login', data={'email': 'non-existing', 'password': 'password'})
            self.assertEquals(rv.status_code, 200)
            self.assertFalse(login_user_mock.called)

    def test_submit_incorrect_password(self):
        user = self.factory.user
        user.hash_password('password')

        self.db.session.add(user)
        self.db.session.commit()

        with patch('redash.handlers.authentication.login_user') as login_user_mock:
            rv = self.client.post('/default/login', data={
                'email': user.email, 'password': 'badbadpassword'})
            self.assertEquals(rv.status_code, 200)
            self.assertFalse(login_user_mock.called)

    def test_submit_empty_password(self):
        user = self.factory.user

        with patch('redash.handlers.authentication.login_user') as login_user_mock:
            rv = self.client.post('/default/login', data={'email': user.email, 'password': ''})
            self.assertEquals(rv.status_code, 200)
            self.assertFalse(login_user_mock.called)

    def test_user_already_loggedin(self):
        with authenticated_user(self.client), patch('redash.handlers.authentication.login_user') as login_user_mock:
            rv = self.client.get('/default/login')
            self.assertEquals(rv.status_code, 302)
            self.assertFalse(login_user_mock.called)


class TestLogout(BaseTestCase):
    def test_logout_when_not_loggedin(self):
        with self.app.test_client() as c:
            rv = c.get('/default/logout')
            self.assertEquals(rv.status_code, 302)
            self.assertFalse(current_user.is_authenticated)

    def test_logout_when_loggedin(self):
        with self.app.test_client() as c, authenticated_user(c, user=self.factory.user):
            rv = c.get('/default/')
            self.assertTrue(current_user.is_authenticated)
            rv = c.get('/default/logout')
            self.assertEquals(rv.status_code, 302)
            self.assertFalse(current_user.is_authenticated)


class TestQuerySnippet(BaseTestCase):
    def test_create(self):
        res = self.make_request(
            'post',
            '/api/query_snippets',
            data={'trigger': 'x', 'description': 'y', 'snippet': 'z'},
            user=self.factory.user)
        self.assertEqual(
            project(res.json, ['id', 'trigger', 'description', 'snippet']), {
                'id': 1,
                'trigger': 'x',
                'description': 'y',
                'snippet': 'z',
            })
        qs = models.QuerySnippet.query.one()
        self.assertEqual(qs.trigger, 'x')
        self.assertEqual(qs.description, 'y')
        self.assertEqual(qs.snippet, 'z')

    def test_edit(self):
        qs = models.QuerySnippet(
            trigger='a',
            description='b',
            snippet='c',
            user=self.factory.user,
            org=self.factory.org
        )
        models.db.session.add(qs)
        models.db.session.commit()
        res = self.make_request(
            'post',
            '/api/query_snippets/1',
            data={'trigger': 'x', 'description': 'y', 'snippet': 'z'},
            user=self.factory.user)
        self.assertEqual(
            project(res.json, ['id', 'trigger', 'description', 'snippet']), {
                'id': 1,
                'trigger': 'x',
                'description': 'y',
                'snippet': 'z',
            })
        self.assertEqual(qs.trigger, 'x')
        self.assertEqual(qs.description, 'y')
        self.assertEqual(qs.snippet, 'z')

    def test_list(self):
        qs = models.QuerySnippet(
            trigger='x',
            description='y',
            snippet='z',
            user=self.factory.user,
            org=self.factory.org
        )
        models.db.session.add(qs)
        models.db.session.commit()
        res = self.make_request(
            'get',
            '/api/query_snippets',
            user=self.factory.user)
        self.assertEqual(res.status_code, 200)
        data = res.json
        self.assertEqual(len(data), 1)
        self.assertEqual(
            project(data[0], ['id', 'trigger', 'description', 'snippet']), {
                'id': 1,
                'trigger': 'x',
                'description': 'y',
                'snippet': 'z',
            })
        self.assertEqual(qs.trigger, 'x')
        self.assertEqual(qs.description, 'y')
        self.assertEqual(qs.snippet, 'z')

    def test_delete(self):
        qs = models.QuerySnippet(
            trigger='a',
            description='b',
            snippet='c',
            user=self.factory.user,
            org=self.factory.org
        )
        models.db.session.add(qs)
        models.db.session.commit()
        self.make_request(
            'delete',
            '/api/query_snippets/1',
            user=self.factory.user)
        self.assertEqual(models.QuerySnippet.query.count(), 0)
