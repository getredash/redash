from mock import patch, call, ANY
from tests import BaseTestCase
from redash.tasks import refresh_queries
from redash.models import Query


class TestRefreshQuery(BaseTestCase):
    def test_enqueues_outdated_queries(self):
        """
        refresh_queries() launches an execution task for each query returned
        from Query.outdated_queries().
        """
        query1 = self.factory.create_query()
        query2 = self.factory.create_query(
            query_text="select 42;",
            data_source=self.factory.create_data_source())
        oq = staticmethod(lambda: [query1, query2])
        with patch('redash.tasks.queries.enqueue_query') as add_job_mock, \
                patch.object(Query, 'outdated_queries', oq):
            refresh_queries()
            self.assertEqual(add_job_mock.call_count, 2)
            add_job_mock.assert_has_calls([
                call(query1.query_text, query1.data_source, query1.user_id,
                     scheduled_query=query1, metadata=ANY),
                call(query2.query_text, query2.data_source, query2.user_id,
                     scheduled_query=query2, metadata=ANY)], any_order=True)

    def test_doesnt_enqueue_outdated_queries_for_paused_data_source(self):
        """
        refresh_queries() does not launch execution tasks for queries whose
        data source is paused.
        """
        query = self.factory.create_query()
        oq = staticmethod(lambda: [query])
        query.data_source.pause()
        with patch.object(Query, 'outdated_queries', oq):
            with patch('redash.tasks.queries.enqueue_query') as add_job_mock:
                refresh_queries()
                add_job_mock.assert_not_called()

            query.data_source.resume()

            with patch('redash.tasks.queries.enqueue_query') as add_job_mock:
                refresh_queries()
                add_job_mock.assert_called_with(
                    query.query_text, query.data_source, query.user_id,
                    scheduled_query=query, metadata=ANY)
