import json
from tests import BaseTestCase
from redash.models import db


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

    def test_returns_404_if_no_cached_result_found(self):
        query = self.factory.create_query(latest_query_data=None)

        rv = self.make_request('get', '/api/queries/{}/results.json'.format(query.id))
        self.assertEqual(404, rv.status_code)


class TestQueryResultListAPI(BaseTestCase):
    def test_get_existing_result(self):
        query_result = self.factory.create_query_result()
        query = self.factory.create_query()

        rv = self.make_request('post', '/api/query_results',
                               data={'data_source_id': self.factory.data_source.id,
                                     'query': query.query_text})
        self.assertEquals(rv.status_code, 200)
        self.assertEquals(query_result.id, rv.json['query_result']['id'])

    def test_execute_new_query(self):
        query_result = self.factory.create_query_result()
        query = self.factory.create_query()

        rv = self.make_request('post', '/api/query_results',
                               data={'data_source_id': self.factory.data_source.id,
                                     'query': query.query_text,
                                     'max_age': 0})

        self.assertEquals(rv.status_code, 200)
        self.assertNotIn('query_result', rv.json)
        self.assertIn('job', rv.json)

    def test_execute_query_without_access(self):
        group = self.factory.create_group()
        db.session.commit()
        user = self.factory.create_user(group_ids=[group.id])
        query = self.factory.create_query()

        rv = self.make_request('post', '/api/query_results',
                               data={'data_source_id': self.factory.data_source.id,
                                     'query': query.query_text,
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

    def test_execute_on_paused_data_source(self):
        self.factory.data_source.pause()

        rv = self.make_request('post', '/api/query_results',
                               data={'data_source_id': self.factory.data_source.id,
                                     'query': 'SELECT 1',
                                     'max_age': 0})

        self.assertEquals(rv.status_code, 400)
        self.assertNotIn('query_result', rv.json)
        self.assertIn('job', rv.json)


class TestQueryResultAPI(BaseTestCase):
    def test_has_no_access_to_data_source(self):
        ds = self.factory.create_data_source(group=self.factory.create_group())
        query_result = self.factory.create_query_result(data_source=ds)

        rv = self.make_request('get', '/api/query_results/{}'.format(query_result.id))
        self.assertEquals(rv.status_code, 403)

    def test_has_view_only_access_to_data_source(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, view_only=True)
        query_result = self.factory.create_query_result(data_source=ds)

        rv = self.make_request('get', '/api/query_results/{}'.format(query_result.id))
        self.assertEquals(rv.status_code, 200)

    def test_has_full_access_to_data_source(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, view_only=False)
        query_result = self.factory.create_query_result(data_source=ds)

        rv = self.make_request('get', '/api/query_results/{}'.format(query_result.id))
        self.assertEquals(rv.status_code, 200)


class TestQueryResultExcelResponse(BaseTestCase):
    def test_renders_excel_file(self):
        query = self.factory.create_query()
        query_result = self.factory.create_query_result()

        rv = self.make_request('get', '/api/queries/{}/results/{}.xlsx'.format(query.id, query_result.id), is_json=False)
        self.assertEquals(rv.status_code, 200)

    def test_renders_excel_file_when_rows_have_missing_columns(self):
        query = self.factory.create_query()
        query_result = self.factory.create_query_result(data=json.dumps({'rows': [{'test': 1}, {'test': 2, 'test2': 3}], 'columns': [{'name': 'test'}, {'name': 'test2'}]}))

        rv = self.make_request('get', '/api/queries/{}/results/{}.xlsx'.format(query.id, query_result.id), is_json=False)
        self.assertEquals(rv.status_code, 200)

