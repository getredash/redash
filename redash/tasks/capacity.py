import re
import itertools
import logging
from rq import Queue, Worker
from rq.job import Job
from redash import settings

logger = logging.getLogger(__name__)


def cleanup_waiting_lists():
    """
    When a job is enqueued/dequeued to/from a CapacityQueue and it exceeds the org/user capacity, it is entered into a waiting list.
    Later on, when a CapacityWorker finishes work on a job and a slot for a job on the waiting list becomes available, the worker will trigger the corresponding job
    on the waiting list and re-queue it back to the original queue.

    However, if a (non-horse) worker dies in the middle of execution, it will not trigger the next item on the waiting list. If there is any other
    job for that org or user queued or executing, they will trigger those jobs eventually, but if no other jobs are queued or executing, the jobs
    on the waiting list may never execute.

    This periodic task looks at all waiting lists and sees if there are no triggers for any of them. In case no triggers are found, we can assume that
    their worker died and re-enqueue them back into their original queues.

    If a waiting list is empty, it can be deleted.
    """
    queues = set(Queue.all())
    waiting_lists = set([q for q in queues if q.name.endswith(":waiting")])
    wip = itertools.chain(
        *[
            queue.started_job_registry.get_job_ids()
            for queue in (queues - waiting_lists)
        ]
    )

    for waiting_list in waiting_lists:
        trigger = next(
            (j for j in wip if waiting_list.name.split(":origin")[0] in j), None
        )

        if trigger is None:
            if waiting_list.is_empty():
                logger.warning(
                    f"Waiting list {waiting_list.name} is empty and will be deleted."
                )
                waiting_list.delete()
            else:
                origin_name = re.findall(r"origin:(.*?):", waiting_list.name)[0]
                logger.warning(
                    f"Waiting list {waiting_list.name} has no executing job to trigger it. Returning all jobs from the waiting list back to their original queue ({origin_name})."
                )
                origin = CapacityQueue(origin_name)

                while waiting_list.count > 0:
                    job_id = waiting_list.pop_job_id()
                    job = Job.fetch(job_id)
                    origin.enqueue_job(job, at_front=True)


entity_key = lambda entity, job: f"{entity}:{job.meta[f'{entity}_id']}"

waiting_list_key = (
    lambda entity, job, origin_name: f"{entity_key(entity, job)}:origin:{origin_name}:waiting"
)


class CapacityQueue(Queue):
    def find_waiting_list(self, job_ids, entity, job):
        executions = sum(map(lambda job_id: entity_key(entity, job) in job_id, job_ids))
        if settings.dynamic_settings.capacity_reached_for(entity, executions, job.meta):
            waiting_list = waiting_list_key(entity, job, self.name)
            logger.warning(
                f"Moving job {job.id} to the {entity}'s waiting list ({waiting_list}) since {entity_key(entity, job)} is currently executing {executions} jobs and has reached the {entity} capacity."
            )
            return waiting_list

    def enter_waiting_list(self, job, pipeline=None):
        if job.meta.get("is_query_execution", False):
            job_ids = self.started_job_registry.get_job_ids()

            waiting_list = self.find_waiting_list(
                job_ids, "user", job
            ) or self.find_waiting_list(job_ids, "org", job)

            if waiting_list:
                return Queue(waiting_list).enqueue_job(job, pipeline=pipeline)

    @classmethod
    def dequeue_any(cls, *args, **kwargs):
        result = super(CapacityQueue, cls).dequeue_any(*args, **kwargs)
        if result is None:
            return None

        job, queue = result

        if queue.enter_waiting_list(job):
            return cls.dequeue_any(*args, **kwargs)
        else:
            return job, queue

    def enqueue_job(self, job, pipeline=None, at_front=False):
        return self.enter_waiting_list(job, pipeline) or super().enqueue_job(
            job, pipeline=pipeline, at_front=at_front
        )


class CapacityWorker(Worker):
    queue_class = CapacityQueue

    def _process_waiting_lists(self, queue, job):
        if job.meta.get("is_query_execution", False):
            waiting_lists = [
                Queue(waiting_list_key("user", job, queue.name)),
                Queue(waiting_list_key("org", job, queue.name)),
            ]

            result = Queue.dequeue_any(waiting_lists, None, job_class=self.job_class)

            if result is not None:
                waiting_job, _ = result
                logger.warning(
                    f"Moving job {waiting_job.id} from waiting list ({waiting_job.origin}) back to the original queue ({queue.name}) since an execution slot opened up for it."
                )
                queue.enqueue_job(waiting_job)

    def handle_job_success(self, job, queue, started_job_registry):
        try:
            super().handle_job_success(job, queue, started_job_registry)
        finally:
            self._process_waiting_lists(queue, job)

    def handle_job_failure(self, job, queue, started_job_registry=None, exc_string=""):
        try:
            super().handle_job_failure(job, queue, started_job_registry, exc_string)
        finally:
            self._process_waiting_lists(queue, job)
