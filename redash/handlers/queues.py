
from redash.handlers.base import BaseResource
from redash.tasks.worker import Queue
from redash.permissions import require_permission
from flask_restful import request
from redash import models

from functools import reduce
from operator import iconcat

class QueueJobListResource(BaseResource):
    @require_permission("view_query")
    def get(self):
        """
        Retrieve a list of jobs queued in a queue.

        :param queue_name: ID of queue to fetch
        """
        
        def extract_data(idx, job):
            data = job.meta
            
            user = models.User.get_by_id(data["user_id"]).to_dict()
            data_source = models.DataSource.get_by_id(data["data_source_id"]).to_dict()
            query_name = models.Query.get_by_id(data["query_id"]).name
            
            return {
                "queue": job.origin,
                "order": idx + 1,
                "user": user["name"],
                "user_id": data["user_id"],
                "query": {
                    "query_id": data["query_id"],
                    "query_name": query_name, 
                },
                "data_source": data_source["name"],
                "enqueued_at": job.enqueued_at
            }
        
        onlyMyQueries = request.args.get('onlyMyQueries', False) == "true"
        queues = request.args.getlist('queues')
        global_queue = []

        for queue_name in queues:   
            queue = Queue(queue_name)
            
            queued_jobs_meta = []
            for idx, element in enumerate(queue.jobs):
                queued_jobs_meta.append(extract_data(idx, element))
                
            
            if onlyMyQueries:
                queued_jobs_meta = list(filter(
                    lambda j: j["user_id"] == self.current_user.to_dict()["id"],
                    queued_jobs_meta
                ))
                
            global_queue.append(queued_jobs_meta)
            
        models.db.session.commit()  
                      
        global_queue = reduce(iconcat, global_queue, [])
                
        return global_queue