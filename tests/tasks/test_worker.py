import redis
from mock import call, patch
from rq import Connection
from rq.job import JobStatus

from redash import rq_redis_connection
from redash.tasks import Queue, Worker
from redash.tasks.queries.execution import enqueue_query
from redash.worker import default_queues, job
from tests import BaseTestCase


@patch("statsd.StatsClient.incr")
class TestWorkerMetrics(BaseTestCase):
    def tearDown(self):
        with Connection(rq_redis_connection):
            for queue_name in default_queues:
                Queue(queue_name).empty()

    def test_worker_records_success_metrics(self, incr):
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

        calls = [
            call("rq.jobs.running.queries"),
            call("rq.jobs.started.queries"),
            call("rq.jobs.running.queries", -1, 1),
            call("rq.jobs.finished.queries"),
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
                {"Username": "Patrick", "query_id": query.id},
            )
            job.set_status(JobStatus.FAILED)

            Worker(["queries"]).work(max_jobs=1)

        calls = [
            call("rq.jobs.running.queries"),
            call("rq.jobs.started.queries"),
            call("rq.jobs.running.queries", -1, 1),
            call("rq.jobs.failed.queries"),
        ]
        incr.assert_has_calls(calls)


@patch("statsd.StatsClient.incr")
class TestQueueMetrics(BaseTestCase):
    def tearDown(self):
        with Connection(rq_redis_connection):
            for queue_name in default_queues:
                Queue(queue_name).empty()

    def test_enqueue_query_records_created_metric(self, incr):
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

        incr.assert_called_with("rq.jobs.created.queries")

    def test_job_delay_records_created_metric(self, incr):
        @job("default", timeout=300)
        def foo():
            pass

        foo.delay()
        incr.assert_called_with("rq.jobs.created.default")


class TestWorkerIpAddress(BaseTestCase):
    def test_tolerates_client_list_entries_without_name(self):
        # Dragonfly lists HTTP connections to its admin port without a name field
        nameless_client = {"id": "1", "addr": "10.0.0.1:12345", "http": "true"}
        client_list = rq_redis_connection.client_list

        with patch.object(rq_redis_connection, "client_list", side_effect=lambda: [nameless_client] + client_list()):
            worker = Worker(["queries"], connection=rq_redis_connection)

        own_client = next(c for c in rq_redis_connection.client_list() if c.get("name") == worker.name)
        self.assertEqual(worker.ip_address, own_client["addr"])
        self.assertIsNotNone(worker.hostname)
        self.assertIsNotNone(worker.pid)

    def test_sets_unknown_ip_address_when_worker_is_not_in_client_list(self):
        with patch.object(rq_redis_connection, "client_list", return_value=[]):
            worker = Worker(["queries"], connection=rq_redis_connection)

        self.assertEqual(worker.ip_address, "unknown")

    def test_sets_unknown_ip_address_when_client_list_is_not_supported(self):
        with patch.object(
            rq_redis_connection, "client_list", side_effect=redis.exceptions.ResponseError("unknown command")
        ):
            worker = Worker(["queries"], connection=rq_redis_connection)

        self.assertEqual(worker.ip_address, "unknown")

    def test_skips_connection_setup_when_not_preparing_for_work(self):
        with patch.object(rq_redis_connection, "client_setname") as client_setname:
            worker = Worker(["queries"], connection=rq_redis_connection, prepare_for_work=False)

        client_setname.assert_not_called()
        self.assertIsNone(worker.hostname)
        self.assertEqual(worker.ip_address, "unknown")
