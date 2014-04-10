"""
Data manager. Used to manage and coordinate execution of queries.
"""
import time
import logging
import peewee
import qr
import redis
import json
from redash import models
from redash.data import worker
from redash.utils import gen_query_hash


class JSONPriorityQueue(qr.PriorityQueue):
    """ Use a JSON serializer to help with cross language support """
    def __init__(self, key, **kwargs):
        super(qr.PriorityQueue, self).__init__(key, **kwargs)
        self.serializer = json


class Manager(object):
    def __init__(self, redis_connection, statsd_client):
        self.statsd_client = statsd_client
        self.redis_connection = redis_connection
        self.workers = []
        self.queue = JSONPriorityQueue("jobs", **self.redis_connection.connection_pool.connection_kwargs)
        self.max_retries = 5
        self.status = {
            'last_refresh_at': 0,
            'started_at': time.time()
        }

        self._save_status()

    def add_job(self, query, priority, data_source):
        query_hash = gen_query_hash(query)
        logging.info("[Manager][%s] Inserting job with priority=%s", query_hash, priority)
        try_count = 0
        job = None

        while try_count < self.max_retries:
            try_count += 1

            pipe = self.redis_connection.pipeline()
            try:
                pipe.watch('query_hash_job:%s' % query_hash)
                job_id = pipe.get('query_hash_job:%s' % query_hash)
                if job_id:
                    logging.info("[Manager][%s] Found existing job: %s", query_hash, job_id)
                    job = worker.Job.load(self.redis_connection, job_id)
                else:
                    job = worker.Job(self.redis_connection, query=query, priority=priority,
                                     data_source_id=data_source.id,
                                     data_source_name=data_source.name,
                                     data_source_type=data_source.type,
                                     data_source_options=data_source.options)
                    pipe.multi()
                    job.save(pipe)
                    logging.info("[Manager][%s] Created new job: %s", query_hash, job.id)
                    self.queue.push(job.id, job.priority)
                break

            except redis.WatchError:
                continue

        if not job:
            logging.error("[Manager][%s] Failed adding job for query.", query_hash)

        return job

    def report_status(self):
        workers = [self.redis_connection.hgetall(w)
                   for w in self.redis_connection.smembers('workers')]

        for w in workers:
            self.statsd_client.gauge('worker_{}.seconds_since_update'.format(w['id']),
                                     time.time() - float(w['updated_at']))
            self.statsd_client.gauge('worker_{}.jobs_received'.format(w['id']), int(w['jobs_count']))
            self.statsd_client.gauge('worker_{}.jobs_done'.format(w['id']), int(w['done_jobs_count']))

        manager_status = self.redis_connection.hgetall('manager:status')
        self.statsd_client.gauge('manager.seconds_since_refresh',
                                 time.time() - float(manager_status['last_refresh_at']))

    def refresh_queries(self):
        # TODO: this will only execute scheduled queries that were executed before. I think this is
        # a reasonable assumption, but worth revisiting.

        # TODO: move this logic to the model.
        outdated_queries = models.Query.select(peewee.Func('first_value', models.Query.id)\
            .over(partition_by=[models.Query.query_hash, models.Query.data_source]))\
            .join(models.QueryResult)\
            .where(models.Query.ttl > 0,
                   (models.QueryResult.retrieved_at +
                    (models.Query.ttl * peewee.SQL("interval '1 second'"))) <
                   peewee.SQL("(now() at time zone 'utc')"))

        queries = models.Query.select(models.Query, models.DataSource).join(models.DataSource)\
            .where(models.Query.id << outdated_queries)

        self.status['last_refresh_at'] = time.time()
        self._save_status()

        logging.info("Refreshing queries...")

        outdated_queries_count = 0
        for query in queries:
            self.add_job(query.query, worker.Job.LOW_PRIORITY, query.data_source)
            outdated_queries_count += 1

        self.statsd_client.gauge('manager.outdated_queries', outdated_queries_count)
        self.statsd_client.gauge('manager.queue_size', self.redis_connection.zcard('jobs'))

        logging.info("Done refreshing queries... %d" % outdated_queries_count)

    def store_query_result(self, data_source_id, query, data, run_time, retrieved_at):
        query_hash = gen_query_hash(query)

        query_result = models.QueryResult.create(query_hash=query_hash,
                                                 query=query,
                                                 runtime=run_time,
                                                 data_source=data_source_id,
                                                 retrieved_at=retrieved_at,
                                                 data=data)

        logging.info("[Manager][%s] Inserted query data; id=%s", query_hash, query_result.id)

        # TODO: move this logic to the model?
        updated_count = models.Query.update(latest_query_data=query_result).\
            where(models.Query.query_hash==query_hash, models.Query.data_source==data_source_id).\
            execute()

        logging.info("[Manager][%s] Updated %s queries.", query_hash, updated_count)

        return query_result.id

    def start_workers(self, workers_count):
        if self.workers:
            return self.workers

        redis_connection_params = self.redis_connection.connection_pool.connection_kwargs
        self.workers = [worker.Worker(worker_id, self, redis_connection_params)
                        for worker_id in xrange(workers_count)]
        for w in self.workers:
            w.start()

        return self.workers

    def stop_workers(self):
        for w in self.workers:
            w.continue_working = False
            w.join()

    def _save_status(self):
        self.redis_connection.hmset('manager:status', self.status)
