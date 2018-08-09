from unittest import TestCase
from collections import namedtuple
import uuid

import mock

from tests import BaseTestCase
from redash import redis_connection, models
from redash.query_runner.pg import PostgreSQL
from redash.tasks.queries import QueryTaskTracker, enqueue_query, execute_query


class TestPrune(TestCase):
    def setUp(self):
        self.list = "test_list"
        redis_connection.delete(self.list)
        self.keys = []
        for score in range(0, 100):
            key = 'k:{}'.format(score)
            self.keys.append(key)
            redis_connection.zadd(self.list, score, key)
            redis_connection.set(key, 1)

    def test_does_nothing_when_below_threshold(self):
        remove_count = QueryTaskTracker.prune(self.list, 100)
        self.assertEqual(remove_count, 0)
        self.assertEqual(redis_connection.zcard(self.list), 100)

    def test_removes_oldest_items_first(self):
        remove_count = QueryTaskTracker.prune(self.list, 50)
        self.assertEqual(remove_count, 50)
        self.assertEqual(redis_connection.zcard(self.list), 50)

        self.assertEqual(redis_connection.zscore(self.list, 'k:99'), 99.0)
        self.assertIsNone(redis_connection.zscore(self.list, 'k:1'))

        for k in self.keys[0:50]:
            self.assertFalse(redis_connection.exists(k))


FakeResult = namedtuple('FakeResult', 'id')


def gen_hash(*args, **kwargs):
    return FakeResult(uuid.uuid4().hex)


class TestEnqueueTask(BaseTestCase):
    def test_multiple_enqueue_of_same_query(self):
        query = self.factory.create_query()
        execute_query.apply_async = mock.MagicMock(side_effect=gen_hash)

        enqueue_query(query.query_text, query.data_source, query.user_id, query, {'Username': 'Arik', 'Query ID': query.id})
        enqueue_query(query.query_text, query.data_source, query.user_id, query, {'Username': 'Arik', 'Query ID': query.id})
        enqueue_query(query.query_text, query.data_source, query.user_id, query, {'Username': 'Arik', 'Query ID': query.id})

        self.assertEqual(1, execute_query.apply_async.call_count)
        self.assertEqual(1, redis_connection.zcard(QueryTaskTracker.WAITING_LIST))
        self.assertEqual(0, redis_connection.zcard(QueryTaskTracker.IN_PROGRESS_LIST))
        self.assertEqual(0, redis_connection.zcard(QueryTaskTracker.DONE_LIST))

    def test_multiple_enqueue_of_different_query(self):
        query = self.factory.create_query()
        execute_query.apply_async = mock.MagicMock(side_effect=gen_hash)

        enqueue_query(query.query_text, query.data_source, query.user_id, None, {'Username': 'Arik', 'Query ID': query.id})
        enqueue_query(query.query_text + '2', query.data_source, query.user_id, None, {'Username': 'Arik', 'Query ID': query.id})
        enqueue_query(query.query_text + '3', query.data_source, query.user_id, None, {'Username': 'Arik', 'Query ID': query.id})

        self.assertEqual(3, execute_query.apply_async.call_count)
        self.assertEqual(3, redis_connection.zcard(QueryTaskTracker.WAITING_LIST))
        self.assertEqual(0, redis_connection.zcard(QueryTaskTracker.IN_PROGRESS_LIST))
        self.assertEqual(0, redis_connection.zcard(QueryTaskTracker.DONE_LIST))


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
        q = self.factory.create_query(query_text="SELECT 1, 2", schedule=300)
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
        q = self.factory.create_query(query_text="SELECT 1, 2", schedule=300)
        with cm, mock.patch.object(PostgreSQL, "run_query") as qr:
            qr.exception = ValueError("broken")
            execute_query("SELECT 1, 2", self.factory.data_source.id, {}, scheduled_query_id=q.id)
            q = models.Query.get_by_id(q.id)
            self.assertEqual(q.schedule_failures, 1)
            execute_query("SELECT 1, 2", self.factory.data_source.id, {}, scheduled_query_id=q.id)
            q = models.Query.get_by_id(q.id)
            self.assertEqual(q.schedule_failures, 2)

    def test_success_after_failure(self):
        """
        Query execution success resets the failure counter.
        """
        cm = mock.patch("celery.app.task.Context.delivery_info",
                        {'routing_key': 'test'})
        q = self.factory.create_query(query_text="SELECT 1, 2", schedule=300)
        with cm, mock.patch.object(PostgreSQL, "run_query") as qr:
            qr.exception = ValueError("broken")
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
