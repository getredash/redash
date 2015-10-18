from tests import BaseTestCase
from tests.factories import query_result_factory, query_factory
from tests.handlers import authenticated_user, json_request

from redash.wsgi import app


class TestQueryResultsCacheHeaders(BaseTestCase):
    def test_uses_cache_headers_for_specific_result(self):
        query_result = query_result_factory.create()
        query = query_factory.create(latest_query_data=query_result)
        with app.test_client() as c, authenticated_user(c):
            rv = json_request(c.get, '/api/queries/{}/results/{}.json'.format(query.id, query_result.id))
            self.assertIn('Cache-Control', rv.headers)

    def test_doesnt_use_cache_headers_for_non_specific_result(self):
        query_result = query_result_factory.create()
        query = query_factory.create(latest_query_data=query_result)
        with app.test_client() as c, authenticated_user(c):
            rv = json_request(c.get, '/api/queries/{}/results.json'.format(query.id))
            self.assertNotIn('Cache-Control', rv.headers)

