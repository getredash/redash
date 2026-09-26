from datetime import datetime, timezone

from mock import ANY, call, patch

from redash.models import Query
from redash.tasks.queries.maintenance import refresh_queries
from redash.utils import gen_query_hash
from tests import BaseTestCase

ENQUEUE_QUERY = "redash.tasks.queries.maintenance.enqueue_query"


class TestRefreshQuery(BaseTestCase):
    def test_scheduled_query_metadata_uses_user_id(self):
        query = self.factory.create_query()
        with patch(ENQUEUE_QUERY) as enqueue, patch.object(Query, "outdated_queries", return_value=[query]):
            refresh_queries()
        metadata = enqueue.call_args[1]["metadata"]
        self.assertEqual(metadata, {"query_id": query.id, "user_id": query.user_id})

    def test_enqueues_outdated_queries_for_sqlquery(self):
        """
        refresh_queries() launches an execution task for each query returned
        from Query.outdated_queries().
        """
        query1 = self.factory.create_query(options={"apply_auto_limit": True})
        query2 = self.factory.create_query(
            query_text="select 42;",
            data_source=self.factory.create_data_source(),
            options={"apply_auto_limit": True},
        )
        oq = staticmethod(lambda: [query1, query2])
        with patch(ENQUEUE_QUERY) as add_job_mock, patch.object(Query, "outdated_queries", oq):
            refresh_queries()
            self.assertEqual(add_job_mock.call_count, 2)
            add_job_mock.assert_has_calls(
                [
                    call(
                        query1.query_text + " LIMIT 1000",
                        query1.data_source,
                        query1.user_id,
                        scheduled_query=query1,
                        metadata={"query_id": query1.id, "user_id": query1.user_id},
                    ),
                    call(
                        "select 42 LIMIT 1000",
                        query2.data_source,
                        query2.user_id,
                        scheduled_query=query2,
                        metadata={"query_id": query2.id, "user_id": query2.user_id},
                    ),
                ],
                any_order=True,
            )

    def test_enqueues_outdated_queries_for_non_sqlquery(self):
        """
        refresh_queries() launches an execution task for each query returned
        from Query.outdated_queries().
        """
        ds = self.factory.create_data_source(group=self.factory.org.default_group, type="prometheus")
        query1 = self.factory.create_query(data_source=ds, options={"apply_auto_limit": True})
        query2 = self.factory.create_query(query_text="select 42;", data_source=ds, options={"apply_auto_limit": True})
        oq = staticmethod(lambda: [query1, query2])
        with patch(ENQUEUE_QUERY) as add_job_mock, patch.object(Query, "outdated_queries", oq):
            refresh_queries()
            self.assertEqual(add_job_mock.call_count, 2)
            add_job_mock.assert_has_calls(
                [
                    call(
                        query1.query_text,
                        query1.data_source,
                        query1.user_id,
                        scheduled_query=query1,
                        metadata={"query_id": query1.id, "user_id": query1.user_id},
                    ),
                    call(
                        query2.query_text,
                        query2.data_source,
                        query2.user_id,
                        scheduled_query=query2,
                        metadata={"query_id": query2.id, "user_id": query2.user_id},
                    ),
                ],
                any_order=True,
            )

    def test_doesnt_enqueue_outdated_queries_for_paused_data_source_for_sqlquery(self):
        """
        refresh_queries() does not launch execution tasks for queries whose
        data source is paused.
        """
        query = self.factory.create_query(options={"apply_auto_limit": True})
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
                    query.query_text + " LIMIT 1000",
                    query.data_source,
                    query.user_id,
                    scheduled_query=query,
                    metadata=ANY,
                )

    def test_doesnt_enqueue_outdated_queries_for_paused_data_source_for_non_sqlquery(
        self,
    ):
        """
        refresh_queries() does not launch execution tasks for queries whose
        data source is paused.
        """
        ds = self.factory.create_data_source(group=self.factory.org.default_group, type="prometheus")
        query = self.factory.create_query(data_source=ds, options={"apply_auto_limit": True})
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

    def test_enqueues_parameterized_queries_for_sqlquery(self):
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
                ],
                "apply_auto_limit": True,
            },
        )
        oq = staticmethod(lambda: [query])
        with patch(ENQUEUE_QUERY) as add_job_mock, patch.object(Query, "outdated_queries", oq):
            refresh_queries()
            add_job_mock.assert_called_with(
                "select 42 LIMIT 1000",
                query.data_source,
                query.user_id,
                scheduled_query=query,
                metadata=ANY,
            )

    def test_enqueues_parameterized_queries_for_non_sqlquery(self):
        """
        Scheduled queries with parameters use saved values.
        """
        ds = self.factory.create_data_source(group=self.factory.org.default_group, type="prometheus")
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
                ],
                "apply_auto_limit": True,
            },
            data_source=ds,
        )
        oq = staticmethod(lambda: [query])
        with patch(ENQUEUE_QUERY) as add_job_mock, patch.object(Query, "outdated_queries", oq):
            refresh_queries()
            add_job_mock.assert_called_with(
                "select 42",
                query.data_source,
                query.user_id,
                scheduled_query=query,
                metadata=ANY,
            )

    def test_enqueues_parameterized_queries_with_dynamic_date_values(self):
        """
        Dynamic date values (e.g. "Last 7 days") are resolved before a scheduled query is enqueued.
        """
        query = self.factory.create_query(
            query_text="select {{d.start}}, {{d.end}}",
            options={
                "parameters": [
                    {
                        "global": False,
                        "type": "date-range",
                        "name": "d",
                        "value": "d_last_7_days",
                        "title": "d",
                    }
                ],
                "apply_auto_limit": False,
            },
        )
        oq = staticmethod(lambda: [query])
        now = datetime(2024, 3, 13, 15, 42, 7, tzinfo=timezone.utc)
        with patch(ENQUEUE_QUERY) as add_job_mock, patch.object(Query, "outdated_queries", oq), patch(
            "redash.models.parameterized_query.utcnow", return_value=now
        ):
            refresh_queries()
            add_job_mock.assert_called_once_with(
                "select 2024-03-06, 2024-03-13",
                query.data_source,
                query.user_id,
                scheduled_query=query,
                metadata=ANY,
            )

    def test_refreshes_query_hash_of_queries_with_dynamic_date_values(self):
        """
        The stored hash follows the resolved text, so the result of the scheduled
        execution gets attached to the query (Query.update_latest_result).
        """
        query = self.factory.create_query(
            query_text="select {{d.start}}, {{d.end}}",
            options={
                "parameters": [
                    {
                        "global": False,
                        "type": "date-range",
                        "name": "d",
                        "value": "d_last_7_days",
                        "title": "d",
                    }
                ],
                "apply_auto_limit": False,
            },
        )
        updated_at = query.updated_at
        oq = staticmethod(lambda: [query])
        now = datetime(2024, 3, 13, 15, 42, 7, tzinfo=timezone.utc)
        with patch(ENQUEUE_QUERY), patch.object(Query, "outdated_queries", oq), patch(
            "redash.models.parameterized_query.utcnow", return_value=now
        ):
            self.assertNotEqual(gen_query_hash("select 2024-03-06, 2024-03-13"), query.query_hash)
            refresh_queries()

        query = Query.get_by_id(query.id)
        self.assertEqual(gen_query_hash("select 2024-03-06, 2024-03-13"), query.query_hash)
        self.assertEqual(updated_at, query.updated_at)

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
                ],
                "apply_auto_limit": True,
            },
        )
        oq = staticmethod(lambda: [query])
        with patch(ENQUEUE_QUERY) as add_job_mock, patch.object(Query, "outdated_queries", oq):
            refresh_queries()
            add_job_mock.assert_not_called()

    def test_doesnt_enqueue_parameterized_queries_with_dropdown_queries_that_are_detached_from_data_source(
        self,
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
                ],
                "apply_auto_limit": True,
            },
        )

        self.factory.create_query(id=100, data_source=None)

        oq = staticmethod(lambda: [query])
        with patch(ENQUEUE_QUERY) as add_job_mock, patch.object(Query, "outdated_queries", oq):
            refresh_queries()
            add_job_mock.assert_not_called()
