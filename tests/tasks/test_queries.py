from unittest import TestCase
from collections import namedtuple
import uuid

import mock

from tests import BaseTestCase
from redash import redis_connection, models
from redash.query_runner.pg import PostgreSQL
from redash.tasks.queries import QueryExecutionError, enqueue_query, execute_query


FakeResult = namedtuple('FakeResult', 'id')


def gen_hash(*args, **kwargs):
    return FakeResult(uuid.uuid4().hex)


class TestEnqueueTask(BaseTestCase):
    def test_multiple_enqueue_of_same_query(self):
        query = self.factory.create_query()
        execute_query.apply_async = mock.MagicMock(side_effect=gen_hash)

        enqueue_query(query.query_text, query.data_source, query.user_id, False, query, {'Username': 'Arik', 'Query ID': query.id})
        enqueue_query(query.query_text, query.data_source, query.user_id, False, query, {'Username': 'Arik', 'Query ID': query.id})
        enqueue_query(query.query_text, query.data_source, query.user_id, False, query, {'Username': 'Arik', 'Query ID': query.id})

        self.assertEqual(1, execute_query.apply_async.call_count)

    @mock.patch('redash.settings.dynamic_settings.query_time_limit', return_value=60)
    def test_limits_query_time(self, _):
        query = self.factory.create_query()
        execute_query.apply_async = mock.MagicMock(side_effect=gen_hash)

        enqueue_query(query.query_text, query.data_source, query.user_id, False, query, {'Username': 'Arik', 'Query ID': query.id})

        _, kwargs = execute_query.apply_async.call_args
        self.assertEqual(60, kwargs.get('time_limit'))

    def test_multiple_enqueue_of_different_query(self):
        query = self.factory.create_query()
        execute_query.apply_async = mock.MagicMock(side_effect=gen_hash)

        enqueue_query(query.query_text, query.data_source, query.user_id, False, None, {'Username': 'Arik', 'Query ID': query.id})
        enqueue_query(query.query_text + '2', query.data_source, query.user_id, False, None, {'Username': 'Arik', 'Query ID': query.id})
        enqueue_query(query.query_text + '3', query.data_source, query.user_id, False, None, {'Username': 'Arik', 'Query ID': query.id})

        self.assertEqual(3, execute_query.apply_async.call_count)


class QueryExecutorTests(BaseTestCase):

    def test_success(self):
        """
        ``execute_query`` invokes the query runner and stores a query result.
        """
        cm = mock.patch("celery.app.task.Context.delivery_info", {'routing_key': 'test'})
        with cm, mock.patch.object(PostgreSQL, "run_query") as qr:
            qr.return_value = ([1, 2], None)
            result_id = execute_query("SELECT 1, 2", self.factory.data_source.id, {})
            self.assertEqual(1, qr.call_count)
            result = models.QueryResult.query.get(result_id)
            self.assertEqual(result.data, '{1,2}')

    def test_success_scheduled(self):
        """
        Scheduled queries remember their latest results.
        """
        cm = mock.patch("celery.app.task.Context.delivery_info",
                        {'routing_key': 'test'})
        q = self.factory.create_query(query_text="SELECT 1, 2", schedule={"interval": 300})
        with cm, mock.patch.object(PostgreSQL, "run_query") as qr:
            qr.return_value = ([1, 2], None)
            result_id = execute_query(
                "SELECT 1, 2",
                self.factory.data_source.id, {},
                scheduled_query_id=q.id)
            q = models.Query.get_by_id(q.id)
            self.assertEqual(q.schedule_failures, 0)
            result = models.QueryResult.query.get(result_id)
            self.assertEqual(q.latest_query_data, result)

    def test_failure_scheduled(self):
        """
        Scheduled queries that fail have their failure recorded.
        """
        cm = mock.patch("celery.app.task.Context.delivery_info",
                        {'routing_key': 'test'})
        q = self.factory.create_query(query_text="SELECT 1, 2", schedule={"interval": 300})
        with cm, mock.patch.object(PostgreSQL, "run_query") as qr:
            qr.side_effect = ValueError("broken")
            with self.assertRaises(QueryExecutionError):
                execute_query("SELECT 1, 2", self.factory.data_source.id, {},
                              scheduled_query_id=q.id)
            q = models.Query.get_by_id(q.id)
            self.assertEqual(q.schedule_failures, 1)
            with self.assertRaises(QueryExecutionError):
                execute_query("SELECT 1, 2", self.factory.data_source.id, {},
                              scheduled_query_id=q.id)
            q = models.Query.get_by_id(q.id)
            self.assertEqual(q.schedule_failures, 2)

    def test_success_after_failure(self):
        """
        Query execution success resets the failure counter.
        """
        cm = mock.patch("celery.app.task.Context.delivery_info",
                        {'routing_key': 'test'})
        q = self.factory.create_query(query_text="SELECT 1, 2", schedule={"interval": 300})
        with cm, mock.patch.object(PostgreSQL, "run_query") as qr:
            qr.side_effect = ValueError("broken")
            with self.assertRaises(QueryExecutionError):
                execute_query("SELECT 1, 2",
                              self.factory.data_source.id, {},
                              scheduled_query_id=q.id)
            q = models.Query.get_by_id(q.id)
            self.assertEqual(q.schedule_failures, 1)

        with cm, mock.patch.object(PostgreSQL, "run_query") as qr:
            qr.return_value = ([1, 2], None)
            execute_query("SELECT 1, 2",
                          self.factory.data_source.id, {},
                          scheduled_query_id=q.id)
            q = models.Query.get_by_id(q.id)
            self.assertEqual(q.schedule_failures, 0)
