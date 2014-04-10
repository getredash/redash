import datetime
from mock import patch, call
from tests import BaseTestCase
from redash.data import worker
from redash import data_manager, models
from tests.factories import query_factory, query_result_factory, data_source_factory
from redash.utils import gen_query_hash


class TestManagerRefresh(BaseTestCase):
    def test_enqueues_outdated_queries(self):
        query = query_factory.create(ttl=60)
        retrieved_at = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
        query_result = query_result_factory.create(retrieved_at=retrieved_at, query=query.query,
                                                   query_hash=query.query_hash)
        query.latest_query_data = query_result
        query.save()

        with patch('redash.data.Manager.add_job') as add_job_mock:
            data_manager.refresh_queries()
            add_job_mock.assert_called_with(query.query, worker.Job.LOW_PRIORITY, query.data_source)

    def test_skips_fresh_queries(self):
        query = query_factory.create(ttl=1200)
        retrieved_at = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
        query_result = query_result_factory.create(retrieved_at=retrieved_at, query=query.query,
                                                   query_hash=query.query_hash)

        with patch('redash.data.Manager.add_job') as add_job_mock:
            data_manager.refresh_queries()
            self.assertFalse(add_job_mock.called)

    def test_skips_queries_with_no_ttl(self):
        query = query_factory.create(ttl=-1)
        retrieved_at = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
        query_result = query_result_factory.create(retrieved_at=retrieved_at, query=query.query,
                                                   query_hash=query.query_hash)

        with patch('redash.data.Manager.add_job') as add_job_mock:
            data_manager.refresh_queries()
            self.assertFalse(add_job_mock.called)

    def test_enqueues_query_only_once(self):
        query = query_factory.create(ttl=60)
        query2 = query_factory.create(ttl=60, query=query.query, query_hash=query.query_hash,
                                      data_source=query.data_source)
        retrieved_at = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
        query_result = query_result_factory.create(retrieved_at=retrieved_at, query=query.query,
                                                   query_hash=query.query_hash)
        query.latest_query_data = query_result
        query2.latest_query_data = query_result
        query.save()
        query2.save()

        with patch('redash.data.Manager.add_job') as add_job_mock:
            data_manager.refresh_queries()
            add_job_mock.assert_called_once_with(query.query, worker.Job.LOW_PRIORITY, query.data_source)

    def test_enqueues_query_with_correct_data_source(self):
        query = query_factory.create(ttl=60)
        query2 = query_factory.create(ttl=60, query=query.query, query_hash=query.query_hash)
        retrieved_at = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
        query_result = query_result_factory.create(retrieved_at=retrieved_at, query=query.query,
                                                   query_hash=query.query_hash)
        query.latest_query_data = query_result
        query2.latest_query_data = query_result
        query.save()
        query2.save()

        with patch('redash.data.Manager.add_job') as add_job_mock:
            data_manager.refresh_queries()
            add_job_mock.assert_has_calls([call(query2.query, worker.Job.LOW_PRIORITY, query2.data_source), call(query.query, worker.Job.LOW_PRIORITY, query.data_source)], any_order=True)
            self.assertEquals(2, add_job_mock.call_count)

    def test_enqueues_only_for_relevant_data_source(self):
        query = query_factory.create(ttl=60)
        query2 = query_factory.create(ttl=3600, query=query.query, query_hash=query.query_hash)
        retrieved_at = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
        query_result = query_result_factory.create(retrieved_at=retrieved_at, query=query.query,
                                                   query_hash=query.query_hash)
        query.latest_query_data = query_result
        query2.latest_query_data = query_result
        query.save()
        query2.save()

        with patch('redash.data.Manager.add_job') as add_job_mock:
            data_manager.refresh_queries()
            add_job_mock.assert_called_once_with(query.query, worker.Job.LOW_PRIORITY, query.data_source)


class TestManagerStoreResults(BaseTestCase):
    def setUp(self):
        super(TestManagerStoreResults, self).setUp()
        self.data_source = data_source_factory.create()
        self.query = "SELECT 1"
        self.query_hash = gen_query_hash(self.query)
        self.runtime = 123
        self.utcnow = datetime.datetime.utcnow()
        self.data = "data"

    def test_stores_the_result(self):
        query_result_id = data_manager.store_query_result(self.data_source.id, self.query,
                                                          self.data, self.runtime, self.utcnow)

        query_result = models.QueryResult.get_by_id(query_result_id)

        self.assertEqual(query_result.data, self.data)
        self.assertEqual(query_result.runtime, self.runtime)
        self.assertEqual(query_result.retrieved_at, self.utcnow)
        self.assertEqual(query_result.query, self.query)
        self.assertEqual(query_result.query_hash, self.query_hash)
        self.assertEqual(query_result.data_source, self.data_source)

    def test_updates_existing_queries(self):
        query1 = query_factory.create(query=self.query, data_source=self.data_source)
        query2 = query_factory.create(query=self.query, data_source=self.data_source)
        query3 = query_factory.create(query=self.query, data_source=self.data_source)

        query_result_id = data_manager.store_query_result(self.data_source.id, self.query,
                                                          self.data, self.runtime, self.utcnow)

        self.assertEqual(models.Query.get_by_id(query1.id)._data['latest_query_data'], query_result_id)
        self.assertEqual(models.Query.get_by_id(query2.id)._data['latest_query_data'], query_result_id)
        self.assertEqual(models.Query.get_by_id(query3.id)._data['latest_query_data'], query_result_id)

    def test_doesnt_update_queries_with_different_hash(self):
        query1 = query_factory.create(query=self.query, data_source=self.data_source)
        query2 = query_factory.create(query=self.query, data_source=self.data_source)
        query3 = query_factory.create(query=self.query + "123", data_source=self.data_source)

        query_result_id = data_manager.store_query_result(self.data_source.id, self.query,
                                                          self.data, self.runtime, self.utcnow)

        self.assertEqual(models.Query.get_by_id(query1.id)._data['latest_query_data'], query_result_id)
        self.assertEqual(models.Query.get_by_id(query2.id)._data['latest_query_data'], query_result_id)
        self.assertNotEqual(models.Query.get_by_id(query3.id)._data['latest_query_data'], query_result_id)


    def test_doesnt_update_queries_with_different_data_source(self):
        query1 = query_factory.create(query=self.query, data_source=self.data_source)
        query2 = query_factory.create(query=self.query, data_source=self.data_source)
        query3 = query_factory.create(query=self.query, data_source=data_source_factory.create())

        query_result_id = data_manager.store_query_result(self.data_source.id, self.query,
                                                          self.data, self.runtime, self.utcnow)

        self.assertEqual(models.Query.get_by_id(query1.id)._data['latest_query_data'], query_result_id)
        self.assertEqual(models.Query.get_by_id(query2.id)._data['latest_query_data'], query_result_id)
        self.assertNotEqual(models.Query.get_by_id(query3.id)._data['latest_query_data'], query_result_id)