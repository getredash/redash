from datetime import timedelta

from mock import call, patch
from rq.job import JobStatus
from rq.utils import now

from redash import rq_redis_connection
from redash.cli.rq import WorkerHealthcheck
from redash.tasks import Job, Queue, Worker
from redash.tasks.queries.execution import enqueue_query
from redash.worker import default_queues, job
from tests import BaseTestCase


@patch("statsd.StatsClient.incr")
class TestWorkerMetrics(BaseTestCase):
    def tearDown(self):
        for queue_name in default_queues:
            Queue(queue_name, connection=rq_redis_connection).empty()

    def test_worker_records_success_metrics(self, incr):
        query = self.factory.create_query()

        enqueue_query(
            query.query_text,
            query.data_source,
            query.user_id,
            False,
            None,
            {"Username": "Patrick", "query_id": query.id},
        )

        Worker(["queries"], connection=rq_redis_connection).work(max_jobs=1)

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

        job = enqueue_query(
            query.query_text,
            query.data_source,
            query.user_id,
            False,
            None,
            {"Username": "Patrick", "query_id": query.id},
        )
        job.set_status(JobStatus.FAILED)

        Worker(["queries"], connection=rq_redis_connection).work(max_jobs=1)

        calls = [
            call("rq.jobs.running.queries"),
            call("rq.jobs.started.queries"),
            call("rq.jobs.running.queries", -1, 1),
            call("rq.jobs.failed.queries"),
        ]
        incr.assert_has_calls(calls)

    @patch("rq.Worker.execute_job")
    def test_worker_counts_expired_job_as_failed(self, execute_job, incr):
        query = self.factory.create_query()
        job = enqueue_query(
            query.query_text,
            query.data_source,
            query.user_id,
            False,
            None,
            {"Username": "Patrick", "query_id": query.id},
        )
        # The job's hash is gone by the time the worker checks its status.
        execute_job.side_effect = lambda *args, **kwargs: job.delete()

        Worker(["queries"], connection=rq_redis_connection).work(max_jobs=1)

        incr.assert_any_call("rq.jobs.failed.queries")
        self.assertNotIn(call("rq.jobs.finished.queries"), incr.call_args_list)


@patch("statsd.StatsClient.incr")
class TestQueueMetrics(BaseTestCase):
    def tearDown(self):
        for queue_name in default_queues:
            Queue(queue_name, connection=rq_redis_connection).empty()

    def test_enqueue_query_records_created_metric(self, incr):
        query = self.factory.create_query()

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


class TestHardLimitingWorker(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.worker = Worker(["queries"], connection=rq_redis_connection)

    def job_with_timeout(self, timeout):
        return Job.create(func=print, timeout=timeout, connection=rq_redis_connection)

    def test_soft_limit_not_exceeded(self):
        self.worker.monitor_started = now() - timedelta(seconds=30)
        self.assertFalse(self.worker.soft_limit_exceeded(self.job_with_timeout(60)))

    def test_soft_limit_exceeded_after_grace_period(self):
        self.worker.monitor_started = now() - timedelta(seconds=60 + self.worker.grace_period + 1)
        self.assertTrue(self.worker.soft_limit_exceeded(self.job_with_timeout(60)))

    def test_soft_limit_longer_than_a_day(self):
        timeout = 2 * 24 * 60 * 60
        self.worker.monitor_started = now() - timedelta(seconds=timeout + self.worker.grace_period + 1)
        self.assertTrue(self.worker.soft_limit_exceeded(self.job_with_timeout(timeout)))


class TestWorkerHealthcheck(BaseTestCase):
    def setUp(self):
        super().setUp()
        self.worker = Worker(["queries"], connection=rq_redis_connection)
        self.worker.register_birth()
        self.addCleanup(self.worker.register_death)

    def check(self):
        log = []
        with patch("redash.cli.rq.socket.gethostname", return_value=self.worker.hostname):
            healthy = WorkerHealthcheck({}, log.append)({"pid": self.worker.pid})
        return healthy, log

    def test_recently_seen_worker_is_healthy(self):
        self.worker.heartbeat()

        healthy, log = self.check()

        self.assertTrue(healthy)
        self.assertIn("Seen lately? True", log[0])

    def test_worker_without_heartbeat(self):
        rq_redis_connection.hdel(self.worker.key, "last_heartbeat")
        self.worker.last_heartbeat = None

        with patch("redash.cli.rq.Worker.all", return_value=[self.worker]):
            healthy, log = self.check()

        # Not seen lately, but healthy because there's nothing queued for it.
        self.assertTrue(healthy)
        self.assertIn("Seen lately? False (None seconds ago)", log[0])

    def test_unknown_worker_is_unhealthy(self):
        with patch("redash.cli.rq.socket.gethostname", return_value="another-host"):
            self.assertFalse(WorkerHealthcheck({}, lambda _: None)({"pid": self.worker.pid}))
