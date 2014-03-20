import datetime
from tests import BaseTestCase
from redash import models
from factories import dashboard_factory, query_factory, data_source_factory, query_result_factory


class DashboardTest(BaseTestCase):
    def test_appends_suffix_to_slug_when_duplicate(self):
        d1 = dashboard_factory.create()
        self.assertEquals(d1.slug, 'test')

        d2 = dashboard_factory.create(user=d1.user)
        self.assertNotEquals(d1.slug, d2.slug)

        d3 = dashboard_factory.create(user=d1.user)
        self.assertNotEquals(d1.slug, d3.slug)
        self.assertNotEquals(d2.slug, d3.slug)


class QueryTest(BaseTestCase):
    def test_changing_query_text_changes_hash(self):
        q = query_factory.create()

        old_hash = q.query_hash
        models.Query.update_instance(q.id, query="SELECT 2;")

        q = models.Query.get_by_id(q.id)

        self.assertNotEquals(old_hash, q.query_hash)


class QueryResultTest(BaseTestCase):
    def setUp(self):
        super(QueryResultTest, self).setUp()

    def test_get_latest_returns_none_if_not_found(self):
        ds = data_source_factory.create()
        found_query_result = models.QueryResult.get_latest(ds, "SELECT 1", 60)
        self.assertIsNone(found_query_result)

    def test_get_latest_returns_when_found(self):
        qr = query_result_factory.create()
        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query, 60)

        self.assertEqual(qr, found_query_result)

    def test_get_latest_works_with_data_source_id(self):
        qr = query_result_factory.create()
        found_query_result = models.QueryResult.get_latest(qr.data_source.id, qr.query, 60)

        self.assertEqual(qr, found_query_result)

    def test_get_latest_doesnt_return_query_from_different_data_source(self):
        qr = query_result_factory.create()
        data_source = data_source_factory.create()
        found_query_result = models.QueryResult.get_latest(data_source, qr.query, 60)

        self.assertIsNone(found_query_result)

    def test_get_latest_doesnt_return_if_ttl_expired(self):
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        qr = query_result_factory.create(retrieved_at=yesterday)

        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query, ttl=60)

        self.assertIsNone(found_query_result)

    def test_get_latest_returns_if_ttl_not_expired(self):
        yesterday = datetime.datetime.now() - datetime.timedelta(seconds=30)
        qr = query_result_factory.create(retrieved_at=yesterday)

        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query, ttl=120)

        self.assertEqual(found_query_result, qr)

    def test_get_latest_returns_the_most_recent_result(self):
        yesterday = datetime.datetime.now() - datetime.timedelta(seconds=30)
        old_qr = query_result_factory.create(retrieved_at=yesterday)
        qr = query_result_factory.create()

        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query, 60)

        self.assertEqual(found_query_result.id, qr.id)