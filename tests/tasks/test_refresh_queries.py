from mock import patch, call, ANY
from tests import BaseTestCase
from redash.tasks.queries.maintenance import refresh_queries
from redash.models import Query

ENQUEUE_QUERY = "redash.tasks.queries.maintenance.enqueue_query"


class TestRefreshQuery(BaseTestCase):
    def test_enqueues_outdated_queries(self):
        """
        refresh_queries() launches an execution task for each query returned
        from Query.outdated_queries().
        """
        query1 = self.factory.create_query()
        query2 = self.factory.create_query(
            query_text="select 42;", data_source=self.factory.create_data_source()
        )
        oq = staticmethod(lambda: [query1, query2])
        with patch(ENQUEUE_QUERY) as add_job_mock, patch.object(
            Query, "outdated_queries", oq
        ):
            refresh_queries()
            self.assertEqual(add_job_mock.call_count, 2)
            add_job_mock.assert_has_calls(
                [
                    call(
                        query1.query_text,
                        query1.data_source,
                        query1.user_id,
                        scheduled_query=query1,
                        metadata=ANY,
                    ),
                    call(
                        query2.query_text,
                        query2.data_source,
                        query2.user_id,
                        scheduled_query=query2,
                        metadata=ANY,
                    ),
                ],
                any_order=True,
            )

    def test_doesnt_enqueue_outdated_queries_for_paused_data_source(self):
        """
        refresh_queries() does not launch execution tasks for queries whose
        data source is paused.
        """
        query = self.factory.create_query()
        oq = staticmethod(lambda: [query])
        query.data_source.pause()
        with patch.object(Query, "outdated_queries", oq):
            with patch(ENQUEUE_QUERY) as add_job_mock:
                refresh_queries()
                add_job_mock.assert_not_called()

            query.data_source.resume()

            with patch(ENQUEUE_QUERY) as add_job_mock:
                refresh_queries()
                add_job_mock.assert_called_with(
                    query.query_text,
                    query.data_source,
                    query.user_id,
                    scheduled_query=query,
                    metadata=ANY,
                )

    def test_enqueues_parameterized_queries(self):
        """
        Scheduled queries with parameters use saved values.
        """
        query = self.factory.create_query(
            query_text="select {{n}}",
            options={
                "parameters": [
                    {
                        "global": False,
                        "type": "text",
                        "name": "n",
                        "value": "42",
                        "title": "n",
                    }
                ]
            },
        )
        oq = staticmethod(lambda: [query])
        with patch(ENQUEUE_QUERY) as add_job_mock, patch.object(
            Query, "outdated_queries", oq
        ):
            refresh_queries()
            add_job_mock.assert_called_with(
                "select 42",
                query.data_source,
                query.user_id,
                scheduled_query=query,
                metadata=ANY,
            )

    def test_doesnt_enqueue_parameterized_queries_with_invalid_parameters(self):
        """
        Scheduled queries with invalid parameters are skipped.
        """
        query = self.factory.create_query(
            query_text="select {{n}}",
            options={
                "parameters": [
                    {
                        "global": False,
                        "type": "text",
                        "name": "n",
                        "value": 42,  # <-- should be text!
                        "title": "n",
                    }
                ]
            },
        )
        oq = staticmethod(lambda: [query])
        with patch(ENQUEUE_QUERY) as add_job_mock, patch.object(
            Query, "outdated_queries", oq
        ):
            refresh_queries()
            add_job_mock.assert_not_called()

    def test_doesnt_enqueue_parameterized_queries_with_dropdown_queries_that_are_detached_from_data_source(
        self
    ):
        """
        Scheduled queries with a dropdown parameter which points to a query that is detached from its data source are skipped.
        """
        query = self.factory.create_query(
            query_text="select {{n}}",
            options={
                "parameters": [
                    {
                        "global": False,
                        "type": "query",
                        "name": "n",
                        "queryId": 100,
                        "title": "n",
                    }
                ]
            },
        )

        dropdown_query = self.factory.create_query(id=100, data_source=None)

        oq = staticmethod(lambda: [query])
        with patch(ENQUEUE_QUERY) as add_job_mock, patch.object(
            Query, "outdated_queries", oq
        ):
            refresh_queries()
            add_job_mock.assert_not_called()
