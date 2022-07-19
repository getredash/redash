
from redash.handlers.base import BaseResource
from redash.tasks.worker import Queue
from redash.permissions import require_permission
from redash import models

class QueueJobListResource(BaseResource):
    @require_permission("view_query")
    def get(self, queue_name):
        """
        Retrieve a list of jobs queued in a queue.

        :param queue_name: ID of queue to fetch
        """
        
        def extract_data(job):
            data = job.meta
            
            user = models.User.get_by_id(data["user_id"]).to_dict()
            data_source = models.DataSource.get_by_id(data["data_source_id"]).to_dict()
            
            return {
                "user": user["name"],
                "enqueued_at": job.enqueued_at,
                "data_source": data_source["name"]
            }
        
        queue = Queue(queue_name)
        
        queued_jobs_meta = list(map(extract_data, queue.jobs))
        
        return queued_jobs_meta