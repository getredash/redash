from tests import BaseTestCase


class TestQueryResultsCacheHeaders(BaseTestCase):
    def test_uses_cache_headers_for_specific_result(self):
        query_result = self.factory.create_query_result()
        query = self.factory.create_query(latest_query_data=query_result)

        rv = self.make_request('get', '/api/queries/{}/results/{}.json'.format(query.id, query_result.id))
        self.assertIn('Cache-Control', rv.headers)

    def test_doesnt_use_cache_headers_for_non_specific_result(self):
        query_result = self.factory.create_query_result()
        query = self.factory.create_query(latest_query_data=query_result)

        rv = self.make_request('get', '/api/queries/{}/results.json'.format(query.id))
        self.assertNotIn('Cache-Control', rv.headers)

