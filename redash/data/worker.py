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
from statsd import StatsClient
from redash.utils import gen_query_hash
from redash.data.query_runner import get_query_runner
from redash import settings


class RedisObject(object):
    # The following should be overriden in the inheriting class:
    fields = {}
    conversions = {}
    id_field = ''
    name = ''

    def __init__(self, redis_connection, **kwargs):
        self.redis_connection = redis_connection
        self.values = {}

        if not self.fields:
            raise ValueError("You must set the fields dictionary, before using RedisObject.")

        if not self.name:
            raise ValueError("You must set the name, before using RedisObject")

        self.update(**kwargs)

    def __getattr__(self, name):
        if name in self.values:
            return self.values[name]
        else:
            raise AttributeError

    def update(self, **kwargs):
        for field, default_value in self.fields.iteritems():
            value = kwargs.get(field, self.values.get(field, default_value))
            if callable(value):
                value = value()

            if value == 'None':
                value = None

            if field in self.conversions and value:
                value = self.conversions[field](value)

            self.values[field] = value

    @classmethod
    def _redis_key(cls, object_id):
        return '{}:{}'.format(cls.name, object_id)

    def save(self, pipe):
        if not pipe:
            pipe = self.redis_connection.pipeline()

        pipe.sadd('{}_set'.format(self.name), self.id)
        pipe.hmset(self._redis_key(self.id), self.values)
        pipe.publish(self._redis_key(self.id), json.dumps(self.to_dict()))

        pipe.execute()

    @classmethod
    def load(cls, redis_connection, object_id):
        object_dict = redis_connection.hgetall(cls._redis_key(object_id))
        obj = None
        if object_dict:
            obj = cls(redis_connection, **object_dict)

        return obj


def fix_unicode(string):
    if isinstance(string, unicode):
        return string

    return string.decode('utf-8')


class Job(RedisObject):
    HIGH_PRIORITY = 1
    LOW_PRIORITY = 2

    WAITING = 1
    PROCESSING = 2
    DONE = 3
    FAILED = 4

    fields = {
        'id': lambda: str(uuid.uuid1()),
        'query': None,
        'priority': None,
        'query_hash': None,
        'wait_time': 0,
        'query_time': 0,
        'error': None,
        'updated_at': time.time,
        'status': WAITING,
        'process_id': None,
        'query_result_id': None,
        'data_source_id': None,
        'data_source_name': None,
        'data_source_type': None,
        'data_source_options': None
    }

    conversions = {
        'query': fix_unicode,
        'priority': int,
        'updated_at': float,
        'status': int,
        'wait_time': float,
        'query_time': float,
        'process_id': int,
        'query_result_id': int
    }

    name = 'job'

    def __init__(self, redis_connection, query, priority, **kwargs):
        kwargs['query'] = fix_unicode(query)
        kwargs['priority'] = priority
        kwargs['query_hash'] = gen_query_hash(kwargs['query'])
        self.new_job = 'id' not in kwargs
        super(Job, self).__init__(redis_connection, **kwargs)

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
            'process_id': self.process_id,
            'data_source_name': self.data_source_name,
            'data_source_type': self.data_source_type
        }

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

        super(Job, self).save(pipe)

    def processing(self, process_id):
        self.update(status=self.PROCESSING,
                    process_id=process_id,
                    wait_time=time.time() - self.updated_at,
                    updated_at=time.time())

        self.save()

    def is_finished(self):
        return self.status in (self.FAILED, self.DONE)

    def done(self, query_result_id, error):
        if error:
            new_status = self.FAILED
        else:
            new_status = self.DONE

        self.update(status=new_status,
                    query_result_id=query_result_id,
                    error=error,
                    query_time=time.time() - self.updated_at,
                    updated_at=time.time())

        self.save()

    def __str__(self):
        return "<Job:%s,priority:%d,status:%d>" % (self.id, self.priority, self.status)


class Worker(threading.Thread):
    def __init__(self, worker_id, manager, redis_connection_params, sleep_time=0.1):
        self.manager = manager

        self.statsd_client = StatsClient(host=settings.STATSD_HOST, port=settings.STATSD_PORT,
                                         prefix=settings.STATSD_PREFIX)
        self.redis_connection_params = {k: v for k, v in redis_connection_params.iteritems()
                                        if k in ('host', 'db', 'password', 'port')}

        self.continue_working = True
        self.sleep_time = sleep_time
        self.child_pid = None
        self.worker_id = worker_id
        self.status = {
            'id': self.worker_id,
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

        logging.info("[%s][%s] Loading query runner (%s, %s)...", self.name, job.id,
                     job.data_source_name, job.data_source_type)

        query_runner = get_query_runner(job.data_source_type, job.data_source_options)

        if getattr(query_runner, 'annotate_query', True):
            annotated_query = "/* Pid: %s, Job Id: %s, Query hash: %s, Priority: %s */ %s" % \
                              (pid, job.id, job.query_hash, job.priority, job.query)
        else:
            annotated_query = job.query

        # TODO: here's the part that needs to be forked, not all of the worker process...
        with self.statsd_client.timer('worker_{}.query_runner.{}.{}.run_time'.format(self.worker_id,
                                                                                     job.data_source_type,
                                                                                     job.data_source_name)):
            data, error = query_runner(annotated_query)

        run_time = time.time() - start_time
        logging.info("[%s][%s] query finished... data length=%s, error=%s",
                     self.name, job.id, data and len(data), error)

        # TODO: it is possible that storing the data will fail, and we will need to retry
        # while we already marked the job as done
        query_result_id = None
        if not error:
            self.set_title("storing results %s" % job_id)
            query_result_id = self.manager.store_query_result(job.data_source_id,
                                                              job.query, data, run_time,
                                                              datetime.datetime.utcnow())

        self.set_title("marking job as done %s" % job_id)
        job.done(query_result_id, error)
