import datetime
from mock import patch, call, ANY
from tests import BaseTestCase
from redash.utils import utcnow
from redash.tasks import refresh_queries
from redash.models import db


# TODO: this test should be split into two:
# 1. tests for Query.outdated_queries method
# 2. test for the refresh_query task
class TestRefreshQueries(BaseTestCase):
    def test_enqueues_outdated_queries(self):
        query = self.factory.create_query(schedule="60")
        retrieved_at = utcnow() - datetime.timedelta(minutes=10)
        query_result = self.factory.create_query_result(retrieved_at=retrieved_at, query_text=query.query_text,
                                                   query_hash=query.query_hash)
        query.latest_query_data = query_result
        db.session.add(query)

        with patch('redash.tasks.queries.enqueue_query') as add_job_mock:
            refresh_queries()
            add_job_mock.assert_called_with(query.query_text, query.data_source, query.user_id, scheduled=True, metadata=ANY)

    def test_doesnt_enqueue_outdated_queries_for_paused_data_source(self):
        query = self.factory.create_query(schedule="60")
        retrieved_at = utcnow() - datetime.timedelta(minutes=10)
        query_result = self.factory.create_query_result(retrieved_at=retrieved_at, query_text=query.query_text,
                                                        query_hash=query.query_hash)
        query.latest_query_data = query_result
        db.session.add(query)
        db.session.commit()

        query.data_source.pause()

        with patch('redash.tasks.queries.enqueue_query') as add_job_mock:
            refresh_queries()
            add_job_mock.assert_not_called()

        query.data_source.resume()

        with patch('redash.tasks.queries.enqueue_query') as add_job_mock:
            refresh_queries()
            add_job_mock.assert_called_with(query.query_text, query.data_source, query.user_id, scheduled=True, metadata=ANY)

    def test_skips_fresh_queries(self):
        query = self.factory.create_query(schedule="1200")
        retrieved_at = utcnow() - datetime.timedelta(minutes=10)
        query_result = self.factory.create_query_result(retrieved_at=retrieved_at, query_text=query.query_text,
                                                        query_hash=query.query_hash)

        with patch('redash.tasks.queries.enqueue_query') as add_job_mock:
            refresh_queries()
            self.assertFalse(add_job_mock.called)

    def test_skips_queries_with_no_ttl(self):
        query = self.factory.create_query(schedule=None)
        retrieved_at = utcnow() - datetime.timedelta(minutes=10)
        query_result = self.factory.create_query_result(retrieved_at=retrieved_at, query_text=query.query_text,
                                                        query_hash=query.query_hash)

        with patch('redash.tasks.queries.enqueue_query') as add_job_mock:
            refresh_queries()
            self.assertFalse(add_job_mock.called)

    def test_enqueues_query_only_once(self):
        query = self.factory.create_query(schedule="60")
        query2 = self.factory.create_query(schedule="60", query_text=query.query_text, query_hash=query.query_hash)
        retrieved_at = utcnow() - datetime.timedelta(minutes=10)
        query_result = self.factory.create_query_result(retrieved_at=retrieved_at, query_text=query.query_text,
                                                        query_hash=query.query_hash)
        query.latest_query_data = query_result
        query2.latest_query_data = query_result
        db.session.add_all([query, query2])

        with patch('redash.tasks.queries.enqueue_query') as add_job_mock:
            refresh_queries()
            add_job_mock.assert_called_once_with(query.query_text, query.data_source, query.user_id, scheduled=True, metadata=ANY)#{'Query ID': query.id, 'Username': 'Scheduled'})

    def test_enqueues_query_with_correct_data_source(self):
        query = self.factory.create_query(schedule="60", data_source=self.factory.create_data_source())
        query2 = self.factory.create_query(schedule="60", query_text=query.query_text, query_hash=query.query_hash)
        retrieved_at = utcnow() - datetime.timedelta(minutes=10)
        query_result = self.factory.create_query_result(retrieved_at=retrieved_at, query_text=query.query_text,
                                                        query_hash=query.query_hash)
        query.latest_query_data = query_result
        query2.latest_query_data = query_result
        db.session.add_all([query, query2])

        with patch('redash.tasks.queries.enqueue_query') as add_job_mock:
            refresh_queries()
            add_job_mock.assert_has_calls([call(query2.query_text, query2.data_source, query2.user_id, scheduled=True, metadata=ANY),
                                           call(query.query_text, query.data_source, query.user_id, scheduled=True, metadata=ANY)],
                                          any_order=True)
            self.assertEquals(2, add_job_mock.call_count)

    def test_enqueues_only_for_relevant_data_source(self):
        query = self.factory.create_query(schedule="60")
        query2 = self.factory.create_query(schedule="3600", query_text=query.query_text, query_hash=query.query_hash)
        retrieved_at = utcnow() - datetime.timedelta(minutes=10)
        query_result = self.factory.create_query_result(retrieved_at=retrieved_at, query_text=query.query_text,
                                                        query_hash=query.query_hash)
        query.latest_query_data = query_result
        query2.latest_query_data = query_result
        db.session.add_all([query, query2])

        with patch('redash.tasks.queries.enqueue_query') as add_job_mock:
            refresh_queries()
            add_job_mock.assert_called_once_with(query.query_text, query.data_source, query.user_id, scheduled=True, metadata=ANY)
