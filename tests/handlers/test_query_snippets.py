from tests import BaseTestCase
from redash.models import QuerySnippet


class TestQuerySnippetResource(BaseTestCase):
    def test_get_snippet(self):
        snippet = self.factory.create_query_snippet()

        rv = self.make_request('get', '/api/query_snippets/{}'.format(snippet.id))

        for field in ('snippet', 'description', 'trigger'):
            self.assertEqual(rv.json[field], getattr(snippet, field))

    def test_update_snippet(self):
        snippet = self.factory.create_query_snippet()

        data = {
            'snippet': 'updated',
            'trigger': 'updated trigger',
            'description': 'updated description'
        }

        rv = self.make_request('post', '/api/query_snippets/{}'.format(snippet.id), data=data)

        for field in ('snippet', 'description', 'trigger'):
            self.assertEqual(rv.json[field], data[field])

    def test_delete_snippet(self):
        snippet = self.factory.create_query_snippet()
        rv = self.make_request('delete', '/api/query_snippets/{}'.format(snippet.id))

        self.assertIsNone(QuerySnippet.query.get(snippet.id))


class TestQuerySnippetListResource(BaseTestCase):
    def test_create_snippet(self):
        data = {
            'snippet': 'updated',
            'trigger': 'updated trigger',
            'description': 'updated description'
        }

        rv = self.make_request('post', '/api/query_snippets', data=data)
        self.assertEqual(rv.status_code, 200)

    def test_list_all_snippets(self):
        snippet1 = self.factory.create_query_snippet()
        snippet2 = self.factory.create_query_snippet()
        snippet_diff_org = self.factory.create_query_snippet(org=self.factory.create_org())

        rv = self.make_request('get', '/api/query_snippets')
        ids = [s['id'] for s in rv.json]

        self.assertIn(snippet1.id, ids)
        self.assertIn(snippet2.id, ids)
        self.assertNotIn(snippet_diff_org.id, ids)

