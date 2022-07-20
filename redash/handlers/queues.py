
from redash.handlers.base import BaseResource
from redash.tasks.worker import Queue
from redash.permissions import require_permission
from flask_restful import request
from redash import models

class QueueJobListResource(BaseResource):
    @require_permission("view_query")
    def get(self, queue_name):
        """
        Retrieve a list of jobs queued in a queue.

        :param queue_name: ID of queue to fetch
        """
        
        def extract_data(idx, job):
            data = job.meta
            
            user = models.User.get_by_id(data["user_id"]).to_dict()
            data_source = models.DataSource.get_by_id(data["data_source_id"]).to_dict()
            
            return {
                "order": idx + 1,
                "user": user["name"],
                "user_id": data["user_id"],
                "query_id": data["query_id"],
                "data_source": data_source["name"],
                "enqueued_at": job.enqueued_at
            }
        
        queue = Queue(queue_name)
        
        queued_jobs_meta = []
        for idx, element in enumerate(queue.jobs):
            queued_jobs_meta.append(extract_data(idx, element))
            
        onlyMyQueries = request.args.get('onlyMy', False) == "true"
        
        if onlyMyQueries:
            queued_jobs_meta = list(filter(
                lambda j: j["user_id"] == self.current_user.to_dict()["id"],
                queued_jobs_meta
            ))
                
        return queued_jobs_meta