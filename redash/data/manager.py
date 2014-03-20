"""
Data manager. Used to manage and coordinate execution of queries.
"""
from contextlib import contextmanager
import collections
import json
import time
import logging
import qr
import redis
from redash.data import worker
from redash.utils import gen_query_hash

class QueryResult(collections.namedtuple('QueryData', 'id query data runtime retrieved_at query_hash')):
    def to_dict(self, parse_data=False):
        d = self._asdict()

        if parse_data and d['data']:
            d['data'] = json.loads(d['data'])

        return d


class Manager(object):
    def __init__(self, redis_connection, db, statsd_client):
        self.statsd_client = statsd_client
        self.redis_connection = redis_connection
        self.db = db
        self.workers = []
        self.queue = qr.PriorityQueue("jobs", **self.redis_connection.connection_pool.connection_kwargs)
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
        sql = """SELECT first_value(t1."query") over(partition by t1.query_hash)
                 FROM "queries" AS t1
                 INNER JOIN "query_results" AS t2 ON (t1."latest_query_data_id" = t2."id")
                 WHERE ((t1."ttl" > 0) AND ((t2."retrieved_at" + t1.ttl * interval '1 second') <
                                           now() at time zone 'utc'));
        """

        self.status['last_refresh_at'] = time.time()
        self._save_status()

        logging.info("Refreshing queries...")
        queries = self.run_query(sql)

        for query in queries:
            self.add_job(query[0], worker.Job.LOW_PRIORITY)

        self.statsd_client.gauge('manager.outdated_queries', len(queries))
        self.statsd_client.gauge('manager.queue_size', self.redis_connection.zcard('jobs'))

        logging.info("Done refreshing queries... %d" % len(queries))

    def store_query_result(self, data_source_id, query, data, run_time, retrieved_at):
        query_result_id = None
        query_hash = gen_query_hash(query)
        sql = "INSERT INTO query_results (query_hash, query, data, runtime, data_source_id, retrieved_at) " \
              "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id"
        with self.db_transaction() as cursor:
            cursor.execute(sql, (query_hash, query, data, run_time, data_source_id, retrieved_at))
            if cursor.rowcount == 1:
                query_result_id = cursor.fetchone()[0]
                logging.info("[Manager][%s] Inserted query data; id=%s", query_hash, query_result_id)

                sql = "UPDATE queries SET latest_query_data_id=%s WHERE query_hash=%s AND data_source_id=%s"
                cursor.execute(sql, (query_result_id, query_hash, data_source_id))

                logging.info("[Manager][%s] Updated %s queries.", query_hash, cursor.rowcount)
            else:
                logging.error("[Manager][%s] Failed inserting query data.", query_hash)
        return query_result_id

    def run_query(self, *args):
        sql = args[0]
        logging.debug("running query: %s %s", sql, args[1:])

        with self.db_transaction() as cursor:
            cursor.execute(sql, args[1:])
            if cursor.description:
                data = list(cursor)
            else:
                data = cursor.rowcount

        return data

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

    @contextmanager
    def db_transaction(self):
        self.db.connect_db()

        cursor = self.db.database.get_cursor()
        try:
            yield cursor
        except:
            self.db.database.rollback()
            raise
        else:
            self.db.database.commit()
        finally:
            self.db.close_db(None)

    def _save_status(self):
        self.redis_connection.hmset('manager:status', self.status)
