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


class QueryResultListAPITest(BaseTestCase):
    def test_get_existing_result(self):
        query_result = self.factory.create_query_result()
        query = self.factory.create_query()

        rv = self.make_request('post', '/api/query_results',
                               data={'data_source_id': self.factory.data_source.id,
                                     'query': query.query})
        self.assertEquals(rv.status_code, 200)
        self.assertEquals(query_result.id, rv.json['query_result']['id'])

    def test_execute_new_query(self):
        query_result = self.factory.create_query_result()
        query = self.factory.create_query()

        rv = self.make_request('post', '/api/query_results',
                               data={'data_source_id': self.factory.data_source.id,
                                     'query': query.query,
                                     'max_age': 0})

        self.assertEquals(rv.status_code, 200)
        self.assertNotIn('query_result', rv.json)
        self.assertIn('job', rv.json)

    def test_execute_query_without_access(self):
        user = self.factory.create_user(groups=[self.factory.create_group().id])
        query = self.factory.create_query()

        rv = self.make_request('post', '/api/query_results',
                               data={'data_source_id': self.factory.data_source.id,
                                     'query': query.query,
                                     'max_age': 0},
                               user=user)

        self.assertEquals(rv.status_code, 403)
        self.assertIn('job', rv.json)

    def test_execute_query_with_params(self):
        query = "SELECT {{param}}"

        rv = self.make_request('post', '/api/query_results',
                               data={'data_source_id': self.factory.data_source.id,
                                     'query': query,
                                     'max_age': 0})

        self.assertEquals(rv.status_code, 400)
        self.assertIn('job', rv.json)

        rv = self.make_request('post', '/api/query_results?p_param=1',
                               data={'data_source_id': self.factory.data_source.id,
                                     'query': query,
                                     'max_age': 0})

        self.assertEquals(rv.status_code, 200)
        self.assertIn('job', rv.json)
