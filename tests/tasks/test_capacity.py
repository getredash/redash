from mock import MagicMock, patch, call
from tests import BaseTestCase

from rq import push_connection, pop_connection, Queue
from rq.job import JobStatus
from redash import rq_redis_connection
from redash.tasks.capacity import CapacityWorker, CapacityQueue
from redash.tasks.worker import Job


def say_hello():
    return "Hello!"


def create_job(job_id, **meta):
    meta["is_query_execution"] = True
    return Job.create(
        say_hello,
        id=f"org:{meta['org_id']}:user:{meta['user_id']}:id:{job_id}",
        meta=meta,
    )


class TestCapacityQueue(BaseTestCase):
    def setUp(self):
        push_connection(rq_redis_connection)

    def tearDown(self):
        pop_connection()
        rq_redis_connection.flushdb()

    @patch("redash.settings.dynamic_settings.capacity_reached_for", return_value=True)
    def test_redirects_to_user_waiting_list_if_over_capacity(self, _):
        queue = CapacityQueue()
        job_1 = queue.enqueue_job(create_job(1, org_id="Acme", user_id="John"))
        job_2 = queue.enqueue_job(create_job(2, org_id="Acme", user_id="John"))

        self.assertEqual(job_1.origin, "user:John:origin:default:waiting")
        self.assertEqual(job_2.origin, "user:John:origin:default:waiting")

    @patch(
        "redash.settings.dynamic_settings.capacity_reached_for",
        side_effect=[False, True, False, True],
    )
    def test_redirects_to_org_waiting_list_if_over_capacity(self, _):
        queue = CapacityQueue()
        job_1 = queue.enqueue_job(create_job(1, org_id="Acme", user_id="John"))
        job_2 = queue.enqueue_job(create_job(2, org_id="Acme", user_id="Mark"))

        self.assertEqual(job_1.origin, "org:Acme:origin:default:waiting")
        self.assertEqual(job_2.origin, "org:Acme:origin:default:waiting")


class TestCapacityWorker(BaseTestCase):
    def setUp(self):
        push_connection(rq_redis_connection)

    def tearDown(self):
        pop_connection()
        rq_redis_connection.flushdb()

    @patch("redash.settings.dynamic_settings.capacity_reached_for", return_value=True)
    def test_always_handles_non_query_execution_jobs(self, _):
        queue = CapacityQueue()
        job = queue.enqueue(say_hello)

        worker = CapacityWorker([queue])
        worker.work(burst=True)

        self.assertEqual(job.get_status(refresh=True), JobStatus.FINISHED)

    def test_handles_job_if_within_capacity(self):
        queue = CapacityQueue()
        job = queue.enqueue_job(create_job(1, org_id="Acme", user_id="John"))

        worker = CapacityWorker([queue])
        worker.work(burst=True)

        self.assertEqual(job.get_status(refresh=True), JobStatus.FINISHED)

    def test_doesnt_handle_job_if_over_user_capacity(self):
        queue = CapacityQueue()
        job_1 = queue.enqueue_job(create_job(1, org_id="Acme", user_id="John"))
        job_2 = queue.enqueue_job(create_job(2, org_id="Acme", user_id="John"))

        worker = CapacityWorker([queue])
        with patch(
            "redash.settings.dynamic_settings.capacity_reached_for",
            side_effect=[False, False, True],
        ):
            worker.work(burst=True)

        job_1.refresh()
        self.assertEqual(job_1.get_status(), JobStatus.FINISHED)

        job_2.refresh()
        self.assertEqual(job_2.get_status(), JobStatus.QUEUED)
        self.assertEqual(job_2.origin, "user:John:origin:default:waiting")

    def test_doesnt_handle_job_if_over_org_capacity(self):
        queue = CapacityQueue()
        job_1 = queue.enqueue_job(create_job(1, org_id="Acme", user_id="John"))
        job_2 = queue.enqueue_job(create_job(2, org_id="Acme", user_id="John"))

        worker = CapacityWorker([queue])
        with patch(
            "redash.settings.dynamic_settings.capacity_reached_for",
            side_effect=[False, False, False, True],
        ):
            worker.work(burst=True)

        job_1.refresh()
        self.assertEqual(job_1.get_status(), JobStatus.FINISHED)

        job_2.refresh()
        self.assertEqual(job_2.get_status(), JobStatus.QUEUED)
        self.assertEqual(job_2.origin, "org:Acme:origin:default:waiting")

    def test_isolates_capacity_between_original_queues(self):
        queries_queue = CapacityQueue("queries")
        adhoc_query = queries_queue.enqueue_job(
            create_job(1, org_id="Acme", user_id="John")
        )

        scheduled_queries_queue = CapacityQueue("scheduled_queries")
        scheduled_query = scheduled_queries_queue.enqueue_job(
            create_job(2, org_id="Acme", user_id="John")
        )

        worker = CapacityWorker([queries_queue, scheduled_queries_queue])
        with patch(
            "redash.settings.dynamic_settings.capacity_reached_for", return_value=True
        ):
            worker.work(burst=True)

        adhoc_query.refresh()
        self.assertEqual(adhoc_query.get_status(), JobStatus.QUEUED)
        self.assertEqual(adhoc_query.origin, "user:John:origin:queries:waiting")

        scheduled_query.refresh()
        self.assertEqual(scheduled_query.get_status(), JobStatus.QUEUED)
        self.assertEqual(
            scheduled_query.origin, "user:John:origin:scheduled_queries:waiting"
        )

    def test_handles_waiting_user_jobs_when_user_slot_opens_up(self):
        user_waiting_list = Queue("user:John:origin:default:waiting")
        user_waiting_job = user_waiting_list.enqueue_job(
            create_job(1, org_id="Acme", user_id="John")
        )

        org_waiting_list = Queue("org:Acme")
        org_waiting_job = org_waiting_list.enqueue_job(
            create_job(2, org_id="Acme", user_id="Mark", original_queue="default")
        )

        queue = CapacityQueue()
        job = queue.enqueue_job(create_job(3, org_id="Acme", user_id="John"))

        worker = CapacityWorker([queue])
        worker.work(max_jobs=2)

        user_waiting_job.refresh()
        self.assertEqual(user_waiting_job.get_status(), JobStatus.FINISHED)
        self.assertEqual(user_waiting_job.origin, "default")

        org_waiting_job.refresh()
        self.assertEqual(org_waiting_job.get_status(), JobStatus.QUEUED)

    def test_handles_waiting_org_jobs_when_org_job_opens_up(self):
        org_waiting_list = Queue("org:Acme:origin:default:waiting")
        org_waiting_job = org_waiting_list.enqueue_job(
            create_job(1, org_id="Acme", user_id="Mark")
        )

        queue = CapacityQueue()
        job = queue.enqueue_job(create_job(2, org_id="Acme", user_id="John"))

        worker = CapacityWorker([queue])
        worker.work(max_jobs=2)

        org_waiting_job.refresh()
        self.assertEqual(org_waiting_job.get_status(), JobStatus.FINISHED)
        self.assertEqual(org_waiting_job.origin, "default")
