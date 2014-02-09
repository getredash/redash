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
import signal
import setproctitle
import redis
from redash.utils import gen_query_hash


class Job(object):
    HIGH_PRIORITY = 1
    LOW_PRIORITY = 2

    WAITING = 1
    PROCESSING = 2
    DONE = 3
    FAILED = 4

    def __init__(self, redis_connection, query, priority,
                 job_id=None,
                 wait_time=None, query_time=None,
                 updated_at=None, status=None, error=None, query_result_id=None,
                 process_id=0):
        self.redis_connection = redis_connection
        self.query = query
        self.priority = priority
        self.query_hash = gen_query_hash(self.query)
        self.query_result_id = query_result_id
        if process_id == 'None':
            self.process_id = None
        else:
            self.process_id = int(process_id)

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
            'query_result_id': self.query_result_id,
            'process_id': self.process_id
        }

    @staticmethod
    def _redis_key(job_id):
        return 'job:%s' % job_id

    def cancel(self):
        # TODO: Race condition:
        # it's possible that it will be picked up by worker while processing the cancel order
        if self.is_finished():
            return

        if self.status == self.PROCESSING:
            os.kill(self.process_id, signal.SIGINT)
        else:
            self.done(None, "Interrupted/Cancelled while running.")

    def save(self, pipe=None):
        if not pipe:
            pipe = self.redis_connection.pipeline()

        if self.new_job:
            pipe.set('query_hash_job:%s' % self.query_hash, self.id)

        if self.is_finished():
            pipe.delete('query_hash_job:%s' % self.query_hash)

        pipe.sadd('jobs_set', self.id)
        pipe.hmset(self._redis_key(self.id), self.to_dict())
        pipe.publish(self._redis_key(self.id), json.dumps(self.to_dict()))
        pipe.execute()

    def processing(self, process_id):
        self.status = self.PROCESSING
        self.process_id = process_id
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
    def _load(cls, redis_connection, job_id):
        return redis_connection.hgetall(cls._redis_key(job_id))

    @classmethod
    def load(cls, redis_connection, job_id):
        job_dict = cls._load(redis_connection, job_id)
        job = None
        if job_dict:
            job = Job(redis_connection, job_id=job_dict['id'], query=job_dict['query'].decode('utf-8'),
                      priority=int(job_dict['priority']), updated_at=float(job_dict['updated_at']),
                      status=int(job_dict['status']), wait_time=float(job_dict['wait_time']),
                      query_time=float(job_dict['query_time']), error=job_dict['error'],
                      query_result_id=job_dict['query_result_id'],
                      process_id=job_dict['process_id'])

        return job


class Worker(threading.Thread):
    def __init__(self, manager, redis_connection_params, query_runner, sleep_time=0.1):
        self.manager = manager

        self.redis_connection_params = {k: v for k, v in redis_connection_params.iteritems()
                                        if k in ('host', 'db', 'password', 'port')}
        self.continue_working = True
        self.query_runner = query_runner
        self.sleep_time = sleep_time
        self.child_pid = None
        self.worker_id = uuid.uuid1()
        self.status = {
            'jobs_count': 0,
            'cancelled_jobs_count': 0,
            'done_jobs_count': 0,
            'updated_at': time.time(),
            'started_at': time.time()
        }
        self._save_status()
        self.manager.redis_connection.sadd('workers', self._key)

        super(Worker, self).__init__(name="Worker-%s" % self.worker_id)

    def set_title(self, title=None):
        base_title = "redash worker:%s" % self.worker_id
        if title:
            full_title = "%s - %s" % (base_title, title)
        else:
            full_title = base_title

        setproctitle.setproctitle(full_title)

    def run(self):
        logging.info("[%s] started.", self.name)
        while self.continue_working:
            job_id = self.manager.queue.pop()
            if job_id:
                self._update_status('jobs_count')
                logging.info("[%s] Processing %s", self.name, job_id)
                self._fork_and_process(job_id)
                if self.child_pid == 0:
                    return
            else:
                time.sleep(self.sleep_time)

    def _update_status(self, counter):
        self.status['updated_at'] = time.time()
        self.status[counter] += 1
        self._save_status()

    @property
    def _key(self):
        return 'worker:%s' % self.worker_id

    def _save_status(self):
        self.manager.redis_connection.hmset(self._key, self.status)

    def _fork_and_process(self, job_id):
        self.child_pid = os.fork()
        if self.child_pid == 0:
            self.set_title("processing %s" % job_id)
            self._process(job_id)
        else:
            logging.info("[%s] Waiting for pid: %d", self.name, self.child_pid)
            _, status = os.waitpid(self.child_pid, 0)
            self._update_status('done_jobs_count')
            if status > 0:
                job = Job.load(self.manager.redis_connection, job_id)
                if not job.is_finished():
                    self._update_status('cancelled_jobs_count')
                    logging.info("[%s] process interrupted and job %s hasn't finished; registering interruption in job",
                                 self.name, job_id)
                    job.done(None, "Interrupted/Cancelled while running.")

            logging.info("[%s] Finished Processing %s (pid: %d status: %d)",
                         self.name, job_id, self.child_pid, status)

    def _process(self, job_id):
        redis_connection = redis.StrictRedis(**self.redis_connection_params)
        job = Job.load(redis_connection, job_id)
        if job.is_finished():
            logging.warning("[%s][%s] tried to process finished job.", self.name, job)
            return

        pid = os.getpid()
        job.processing(pid)

        logging.info("[%s][%s] running query...", self.name, job.id)
        start_time = time.time()
        self.set_title("running query %s" % job_id)

        annotated_query = "/* Pid: %s, Job Id: %s, Query hash: %s, Priority: %s */ %s" % \
                          (pid, job.id, job.query_hash, job.priority, job.query)

        # TODO: here's the part that needs to be forked, not all of the worker process...
        data, error = self.query_runner(annotated_query)
        run_time = time.time() - start_time
        logging.info("[%s][%s] query finished... data length=%s, error=%s",
                     self.name, job.id, data and len(data), error)

        # TODO: it is possible that storing the data will fail, and we will need to retry
        # while we already marked the job as done
        query_result_id = None
        if not error:
            self.set_title("storing results %s" % job_id)
            query_result_id = self.manager.store_query_result(job.query, data, run_time,
                                                              datetime.datetime.utcnow())

        self.set_title("marking job as done %s" % job_id)
        job.done(query_result_id, error)
