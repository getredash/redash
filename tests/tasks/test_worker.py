from mock import patch
from rq import Connection
from rq.job import JobStatus

from redash import rq_redis_connection
from redash.tasks import Queue, Worker
from redash.tasks.queries.execution import enqueue_query
from redash.worker import default_queues, job
from tests import BaseTestCase


@patch("prometheus_client.Gauge.inc")
class TestWorkerMetrics(BaseTestCase):
    def tearDown(self):
        with Connection(rq_redis_connection):
            for queue_name in default_queues:
                Queue(queue_name).empty()

    def test_worker_records_success_metrics(self, inc):
        query = self.factory.create_query()

        with Connection(rq_redis_connection):
            enqueue_query(
                query.query_text,
                query.data_source,
                query.user_id,
                False,
                None,
                {"Username": "Patrick", "query_id": query.id},
            )

            Worker(["queries"]).work(max_jobs=1)

        inc.assert_called()

    @patch("rq.Worker.execute_job")
    def test_worker_records_failure_metrics(self, _, inc):
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
                {"Username": "Patrick", "query_id": query.id},
            )
            job.set_status(JobStatus.FAILED)

            Worker(["queries"]).work(max_jobs=1)

        inc.assert_called()


@patch("prometheus_client.Gauge.inc")
class TestQueueMetrics(BaseTestCase):
    def tearDown(self):
        with Connection(rq_redis_connection):
            for queue_name in default_queues:
                Queue(queue_name).empty()

    def test_enqueue_query_records_created_metric(self, inc):
        query = self.factory.create_query()

        with Connection(rq_redis_connection):
            enqueue_query(
                query.query_text,
                query.data_source,
                query.user_id,
                False,
                None,
                {"Username": "Patrick", "query_id": query.id},
            )

        inc.assert_called_once()

    def test_job_delay_records_created_metric(self, inc):
        @job("default", timeout=300)
        def foo():
            pass

        foo.delay()
        inc.assert_called()
