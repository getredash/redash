from unittest import TestCase
import uuid

from mock import patch, Mock

from rq import Connection

from tests import BaseTestCase
from redash import redis_connection, rq_redis_connection, models
from redash.utils import json_dumps
from redash.query_runner.pg import PostgreSQL
from redash.tasks.queries.execution import (
    QueryExecutionError,
    enqueue_query,
    execute_query,
)
from redash.tasks import Job


def fetch_job(*args, **kwargs):
    if any(args):
        job_id = args[0] if isinstance(args[0], str) else args[0].id
    else:
        job_id = create_job().id

    result = Mock()
    result.id = job_id

    return result


def create_job(*args, **kwargs):
    return Job(connection=rq_redis_connection)


@patch("redash.tasks.queries.execution.Job.fetch", side_effect=fetch_job)
@patch("redash.tasks.queries.execution.Queue.enqueue", side_effect=create_job)
class TestEnqueueTask(BaseTestCase):
    def test_multiple_enqueue_of_same_query(self, enqueue, _):
        query = self.factory.create_query()

        with Connection(rq_redis_connection):
            enqueue_query(
                query.query_text,
                query.data_source,
                query.user_id,
                False,
                query,
                {"Username": "Arik", "Query ID": query.id},
            )
            enqueue_query(
                query.query_text,
                query.data_source,
                query.user_id,
                False,
                query,
                {"Username": "Arik", "Query ID": query.id},
            )
            enqueue_query(
                query.query_text,
                query.data_source,
                query.user_id,
                False,
                query,
                {"Username": "Arik", "Query ID": query.id},
            )

        self.assertEqual(1, enqueue.call_count)

    @patch("redash.settings.dynamic_settings.query_time_limit", return_value=60)
    def test_limits_query_time(self, _, enqueue, __):
        query = self.factory.create_query()

        with Connection(rq_redis_connection):
            enqueue_query(
                query.query_text,
                query.data_source,
                query.user_id,
                False,
                query,
                {"Username": "Arik", "Query ID": query.id},
            )

        _, kwargs = enqueue.call_args
        self.assertEqual(60, kwargs.get("job_timeout"))

    def test_multiple_enqueue_of_different_query(self, enqueue, _):
        query = self.factory.create_query()

        with Connection(rq_redis_connection):
            enqueue_query(
                query.query_text,
                query.data_source,
                query.user_id,
                False,
                None,
                {"Username": "Arik", "Query ID": query.id},
            )
            enqueue_query(
                query.query_text + "2",
                query.data_source,
                query.user_id,
                False,
                None,
                {"Username": "Arik", "Query ID": query.id},
            )
            enqueue_query(
                query.query_text + "3",
                query.data_source,
                query.user_id,
                False,
                None,
                {"Username": "Arik", "Query ID": query.id},
            )

        self.assertEqual(3, enqueue.call_count)


@patch("redash.tasks.queries.execution.get_current_job", side_effect=fetch_job)
class QueryExecutorTests(BaseTestCase):
    def test_success(self, _):
        """
        ``execute_query`` invokes the query runner and stores a query result.
        """
        with patch.object(PostgreSQL, "run_query") as qr:
            query_result_data = {"columns": [], "rows": []}
            qr.return_value = (json_dumps(query_result_data), None)
            result_id = execute_query("SELECT 1, 2", self.factory.data_source.id, {})
            self.assertEqual(1, qr.call_count)
            result = models.QueryResult.query.get(result_id)
            self.assertEqual(result.data, query_result_data)

    def test_success_scheduled(self, _):
        """
        Scheduled queries remember their latest results.
        """
        q = self.factory.create_query(
            query_text="SELECT 1, 2", schedule={"interval": 300}
        )
        with patch.object(PostgreSQL, "run_query") as qr:
            qr.return_value = ([1, 2], None)
            result_id = execute_query(
                "SELECT 1, 2", self.factory.data_source.id, {}, scheduled_query_id=q.id
            )
            q = models.Query.get_by_id(q.id)
            self.assertEqual(q.schedule_failures, 0)
            result = models.QueryResult.query.get(result_id)
            self.assertEqual(q.latest_query_data, result)

    def test_failure_scheduled(self, _):
        """
        Scheduled queries that fail have their failure recorded.
        """
        q = self.factory.create_query(
            query_text="SELECT 1, 2", schedule={"interval": 300}
        )
        with patch.object(PostgreSQL, "run_query") as qr:
            qr.side_effect = ValueError("broken")

            result = execute_query(
                "SELECT 1, 2", self.factory.data_source.id, {}, scheduled_query_id=q.id
            )
            self.assertTrue(isinstance(result, QueryExecutionError))
            q = models.Query.get_by_id(q.id)
            self.assertEqual(q.schedule_failures, 1)

            result = execute_query(
                "SELECT 1, 2", self.factory.data_source.id, {}, scheduled_query_id=q.id
            )
            self.assertTrue(isinstance(result, QueryExecutionError))
            q = models.Query.get_by_id(q.id)
            self.assertEqual(q.schedule_failures, 2)

    def test_success_after_failure(self, _):
        """
        Query execution success resets the failure counter.
        """
        q = self.factory.create_query(
            query_text="SELECT 1, 2", schedule={"interval": 300}
        )
        with patch.object(PostgreSQL, "run_query") as qr:
            qr.side_effect = ValueError("broken")
            result = execute_query(
                "SELECT 1, 2", self.factory.data_source.id, {}, scheduled_query_id=q.id
            )
            self.assertTrue(isinstance(result, QueryExecutionError))
            q = models.Query.get_by_id(q.id)
            self.assertEqual(q.schedule_failures, 1)

        with patch.object(PostgreSQL, "run_query") as qr:
            qr.return_value = ([1, 2], None)
            execute_query(
                "SELECT 1, 2", self.factory.data_source.id, {}, scheduled_query_id=q.id
            )
            q = models.Query.get_by_id(q.id)
            self.assertEqual(q.schedule_failures, 0)
