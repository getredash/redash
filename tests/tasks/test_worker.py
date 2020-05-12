from mock import patch, call, ANY
from tests import BaseTestCase
from rq import Connection
from rq.job import JobStatus
from redash.tasks import Worker
from redash import rq_redis_connection

from tests import BaseTestCase
from redash import redis_connection, rq_redis_connection, models
from redash.tasks.queries.execution import (
    enqueue_query,
)


@patch("statsd.StatsClient.incr")
class TestWorkerMetrics(BaseTestCase):
    def test_worker_records_success_metrics(self, incr):
        query = self.factory.create_query()

        with Connection(rq_redis_connection):
            enqueue_query(
                query.query_text,
                query.data_source,
                query.user_id,
                False,
                None,
                {"Username": "Patrick", "Query ID": query.id},
            )

            Worker(["queries"]).work(max_jobs=1)

        calls = [
            call("rq.jobs.running.queries"),
            call("rq.jobs.started.queries"),
            call("rq.jobs.running.queries", -1, 1),
            call("rq.jobs.finished.queries")
        ]
        incr.assert_has_calls(calls)

    @patch("rq.Worker.execute_job")
    def test_worker_records_failure_metrics(self, _, incr):
        """
        Force superclass execute_job to do nothing and set status to JobStatus.Failed to simulate query failure
        """
        query = self.factory.create_query()

        with Connection(rq_redis_connection):
            job = enqueue_query(
                query.query_text,
                query.data_source,
                query.user_id,
                False,
                None,
                {"Username": "Patrick", "Query ID": query.id},
            )
            job.set_status(JobStatus.FAILED)

            Worker(["queries"]).work(max_jobs=1)

        calls = [
            call("rq.jobs.running.queries"),
            call("rq.jobs.started.queries"),
            call("rq.jobs.running.queries", -1, 1),
            call("rq.jobs.failed.queries")
        ]
        incr.assert_has_calls(calls)
