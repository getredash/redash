"""
Worker implementation to execute incoming queries.
"""
import json
import logging
import os
import threading
import uuid
import datetime
import time
from utils import gen_query_hash


class Job(object):
    HIGH_PRIORITY = 1
    LOW_PRIORITY = 2

    WAITING = 1
    PROCESSING = 2
    DONE = 3
    FAILED = 4

    def __init__(self, data_manager, query, priority,
                 job_id=None,
                 wait_time=None, query_time=None,
                 updated_at=None, status=None, error=None, query_result_id=None):
        self.data_manager = data_manager
        self.query = query
        self.priority = priority
        self.query_hash = gen_query_hash(self.query)
        self.query_result_id = query_result_id

        if job_id is None:
            self.id = str(uuid.uuid1())
            self.new_job = True
            self.wait_time = 0
            self.query_time = 0
            self.error = None
            self.updated_at = time.time() # job_dict.get('updated_at', time.time())
            self.status = self.WAITING # int(job_dict.get('status', self.WAITING))
        else:
            self.id = job_id
            self.new_job = False
            self.error = error
            self.wait_time = wait_time
            self.query_time = query_time
            self.updated_at = updated_at
            self.status = status

    def to_dict(self):
        return {
            'query': self.query,
            'priority': self.priority,
            'id': self.id,
            'wait_time': self.wait_time,
            'query_time': self.query_time,
            'updated_at': self.updated_at,
            'status': self.status,
            'error': self.error,
            'query_result_id': self.query_result_id
        }

    @staticmethod
    def _redis_key(job_id):
        return 'job:%s' % job_id

    def save(self, pipe=None):
        if not pipe:
            pipe = self.data_manager.redis_connection.pipeline()

        if self.new_job:
            pipe.set('query_hash_job:%s' % self.query_hash, self.id)

        if self.is_finished():
            pipe.delete('query_hash_job:%s' % self.query_hash)

        pipe.sadd('jobs_set', self.id)
        pipe.hmset(self._redis_key(self.id), self.to_dict())
        pipe.publish(self._redis_key(self.id), json.dumps(self.to_dict()))
        pipe.execute()

    def processing(self):
        self.status = self.PROCESSING
        self.wait_time = time.time() - self.updated_at
        self.updated_at = time.time()
        self.save()

    def is_finished(self):
        return self.status in (self.FAILED, self.DONE)

    def done(self, query_result_id, error):
        if error:
            self.status = self.FAILED
        else:
            self.status = self.DONE

        self.query_result_id = query_result_id
        self.error = error
        self.query_time = time.time() - self.updated_at
        self.updated_at = time.time()
        self.save()

    def __str__(self):
        return "<Job:%s,priority:%d,status:%d>" % (self.id, self.priority, self.status)

    @classmethod
    def _load(cls, data_manager, job_id):
        return data_manager.redis_connection.hgetall(cls._redis_key(job_id))

    @classmethod
    def load(cls, data_manager, job_id):
        job_dict = cls._load(data_manager, job_id)
        job = None
        if job_dict:
            job = Job(data_manager, job_id=job_dict['id'], query=job_dict['query'].decode('utf-8'),
                      priority=int(job_dict['priority']), updated_at=float(job_dict['updated_at']),
                      status=int(job_dict['status']), wait_time=float(job_dict['wait_time']),
                      query_time=float(job_dict['query_time']), error=job_dict['error'],
                      query_result_id=job_dict['query_result_id'])

        return job


class Worker(threading.Thread):
    def __init__(self, manager, query_runner, sleep_time=0.1):
        self.manager = manager
        self.continue_working = True
        self.query_runner = query_runner
        self.sleep_time = sleep_time

        super(Worker, self).__init__(name="Worker-%s" % uuid.uuid1())

    def run(self):
        logging.info("[%s] started.", self.name)
        while self.continue_working:
            job_id = self.manager.queue.pop()
            if job_id:
                logging.info("[%s] Processing %s", self.name, job_id)

                self._fork_and_process(job_id)
            else:
                time.sleep(self.sleep_time)

    def _fork_and_process(self, job_id):
        child_pid = os.fork()
        if child_pid == 0:
            self._process(job_id)
        else:
            logging.info("[%s] Waiting for pid: %d", self.name, child_pid)
            _, status = os.waitpid(child_pid, 0)
            logging.info("[%s] Finished Processing %s (pid: %d status: %d)",
                         self.name, job_id, child_pid, status)

    def _process(self, job_id):
        job = Job.load(self.manager, job_id)
        if job.is_finished():
            logging.warning("[%s][%s] tried to process finished job.", self.name, job)
            return

        job.processing()

        logging.info("[%s][%s] running query...", self.name, job.id)
        start_time = time.time()
        data, error = self.query_runner(job.query)
        run_time = time.time() - start_time
        logging.info("[%s][%s] query finished... data length=%s, error=%s",
                     self.name, job.id, data and len(data), error)

        # TODO: it is possible that storing the data will fail, and we will need to retry
        # while we already marked the job as done
        query_result_id = None
        if not error:
            query_result_id = self.manager.store_query_result(job.query, data, run_time,
                                                              datetime.datetime.utcnow())

        job.done(query_result_id, error)
