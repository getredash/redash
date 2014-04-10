# coding=utf-8

import time
from unittest import TestCase
from mock import patch
from redash.data.worker import Job
from redash import redis_connection
from redash.utils import gen_query_hash


class TestJob(TestCase):
    def setUp(self):
        self.priority = 1
        self.query = "SELECT 1"
        self.query_hash = gen_query_hash(self.query)

    def test_job_creation(self):
        now = time.time()
        with patch('time.time', return_value=now):
            job = Job(redis_connection, query=self.query, priority=self.priority)
        self.assertIsNotNone(job.id)
        self.assertTrue(job.new_job)
        self.assertEquals(0, job.wait_time)
        self.assertEquals(0, job.query_time)
        self.assertEquals(None, job.process_id)
        self.assertEquals(Job.WAITING, job.status)
        self.assertEquals(self.priority, job.priority)
        self.assertEquals(self.query, job.query)
        self.assertEquals(self.query_hash, job.query_hash)
        self.assertIsNone(job.error)
        self.assertIsNone(job.query_result_id)

    def test_job_loading(self):
        job = Job(redis_connection, query=self.query, priority=self.priority)
        job.save()

        loaded_job = Job.load(redis_connection, job.id)

        self.assertFalse(loaded_job.new_job)

        self.assertEquals(loaded_job.id, job.id)
        self.assertEquals(loaded_job.wait_time, job.wait_time)
        self.assertEquals(loaded_job.query_time, job.query_time)
        self.assertEquals(loaded_job.process_id, job.process_id)
        self.assertEquals(loaded_job.status, job.status)
        self.assertEquals(loaded_job.priority, job.priority)
        self.assertEquals(loaded_job.query_hash, job.query_hash)
        self.assertEquals(loaded_job.query, job.query)
        self.assertEquals(loaded_job.error, job.error)
        self.assertEquals(loaded_job.query_result_id, job.query_result_id)

    def test_update(self):
        job = Job(redis_connection, query=self.query, priority=self.priority)

        job.update(process_id=1)
        self.assertEquals(1, job.process_id)
        self.assertEquals(self.query, job.query)
        self.assertEquals(self.priority, job.priority)

    def test_processing(self):
        job = Job(redis_connection, query=self.query, priority=self.priority)

        updated_at = job.updated_at
        now = time.time()+10
        with patch('time.time', return_value=now):
            job.processing(10)

        job = Job.load(redis_connection, job.id)

        self.assertEquals(10, job.process_id)
        self.assertEquals(Job.PROCESSING, job.status)
        self.assertEquals(now, job.updated_at)
        self.assertEquals(now - updated_at, job.wait_time)

    def test_done(self):
        job = Job(redis_connection, query=self.query, priority=self.priority)

        updated_at = job.updated_at
        now = time.time()+10
        with patch('time.time', return_value=now):
            job.done(1, None)

        job = Job.load(redis_connection, job.id)

        self.assertEquals(Job.DONE, job.status)
        self.assertEquals(1, job.query_result_id)
        self.assertEquals(now, job.updated_at)
        self.assertEquals(now - updated_at, job.query_time)
        self.assertIsNone(job.error)

    def test_unicode_serialization(self):
        unicode_query = u"יוניקוד"
        job = Job(redis_connection, query=unicode_query, priority=self.priority)

        self.assertEquals(job.query, unicode_query)

        job.save()
        loaded_job = Job.load(redis_connection, job.id)
        self.assertEquals(loaded_job.query, unicode_query)

