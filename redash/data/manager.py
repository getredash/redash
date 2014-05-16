"""
Data manager. Used to manage and coordinate execution of queries.
"""
import time
import logging
from celery.result import AsyncResult
import peewee
import redis
from redash import models, celery
from redash.tasks import execute_query
from redash.utils import gen_query_hash


class Job(object):
    # TODO: this is mapping to the old Job class statuses. Need to update the client side and remove this
    STATUSES = {
        'PENDING': 1,
        'STARTED': 2,
        'SUCCESS': 3,
        'FAILURE': 4,
        'REVOKED': 4
    }

    def __init__(self, job_id=None, async_result=None):
        if async_result:
            self._async_result = async_result
        else:
            self._async_result = AsyncResult(job_id, app=celery)

    @property
    def id(self):
        return self._async_result.id

    def to_dict(self):
        if self._async_result.status == 'STARTED':
            updated_at = self._async_result.result['start_time']
        else:
            updated_at = 0

        if self._async_result.failed() and isinstance(self._async_result.result, Exception):
            error = self._async_result.result.message
        elif self._async_result.status == 'REVOKED':
            error = 'Query execution cancelled.'
        else:
            error = ''

        if self._async_result.successful():
            query_result_id = self._async_result.result
        else:
            query_result_id = None

        return {
            'id': self._async_result.id,
            'updated_at': updated_at,
            'status': self.STATUSES[self._async_result.status],
            'error': error,
            'query_result_id': query_result_id,
        }

    def cancel(self):
        return self._async_result.revoke(terminate=True)


class Manager(object):
    def __init__(self, redis_connection, statsd_client):
        self.statsd_client = statsd_client
        self.redis_connection = redis_connection
        self.max_retries = 5
        self.status = {
            'last_refresh_at': 0,
            'started_at': time.time()
        }

        self._save_status()

    def add_job(self, query, data_source):
        query_hash = gen_query_hash(query)
        logging.info("[Manager][%s] Inserting job", query_hash)
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

                    job = Job(job_id=job_id)
                else:
                    pipe.multi()
                    job = Job(async_result=execute_query.delay(query, data_source.id))
                    logging.info("[Manager][%s] Created new job: %s", query_hash, job.id)
                    pipe.set('query_hash_job:%s' % query_hash, job.id)
                break

            except redis.WatchError:
                continue

        if not job:
            logging.error("[Manager][%s] Failed adding job for query.", query_hash)

        return job

    def report_status(self):
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
            # TODO: this should go into lower priority
            self.add_job(query.query, query.data_source)
            outdated_queries_count += 1

        self.statsd_client.gauge('manager.outdated_queries', outdated_queries_count)
        self.statsd_client.gauge('manager.queue_size', self.redis_connection.zcard('jobs'))

        logging.info("Done refreshing queries... %d" % outdated_queries_count)

    def _save_status(self):
        self.redis_connection.hmset('manager:status', self.status)
