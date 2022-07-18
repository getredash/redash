
from redash.handlers.base import BaseResource
from redash.tasks.worker import Queue
from redash.permissions import require_permission

class QueueJobListResource(BaseResource):
    @require_permission("view_query")
    def get(self, queue_name):
        """
        Retrieve a list of jobs queued in a queue.

        :param queue_name: ID of queue to fetch
        """
        
        def extract_data(job):
            return {
                **job.meta,
                "enqueued_at": job.enqueued_at
            }
        
        queue = Queue(queue_name)
        
        queued_jobs_meta = list(map(extract_data, queue.jobs))
        
        return queued_jobs_meta