#encoding: utf8
import datetime
import json
from unittest import TestCase
import mock
from tests import BaseTestCase
from redash import models
from factories import dashboard_factory, query_factory, data_source_factory, query_result_factory, user_factory, widget_factory
from redash.utils import gen_query_hash
from redash import query_runner


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

    def test_search_finds_in_name(self):
        q1 = query_factory.create(name=u"Testing seåřċħ")
        q2 = query_factory.create(name=u"Testing seåřċħing")
        q3 = query_factory.create(name=u"Testing seå řċħ")

        queries = models.Query.search(u"seåřċħ")

        self.assertIn(q1, queries)
        self.assertIn(q2, queries)
        self.assertNotIn(q3, queries)

    def test_search_finds_in_description(self):
        q1 = query_factory.create(description=u"Testing seåřċħ")
        q2 = query_factory.create(description=u"Testing seåřċħing")
        q3 = query_factory.create(description=u"Testing seå řċħ")

        queries = models.Query.search(u"seåřċħ")

        self.assertIn(q1, queries)
        self.assertIn(q2, queries)
        self.assertNotIn(q3, queries)

    def test_search_by_id_returns_query(self):
        q1 = query_factory.create(description="Testing search")
        q2 = query_factory.create(description="Testing searching")
        q3 = query_factory.create(description="Testing sea rch")


        queries = models.Query.search(str(q3.id))

        self.assertIn(q3, queries)
        self.assertNotIn(q1, queries)
        self.assertNotIn(q2, queries)

    def test_save_creates_default_visualization(self):
        q = query_factory.create()
        self.assertEquals(q.visualizations.count(), 1)

    def test_save_updates_updated_at_field(self):
        # This should be a test of ModelTimestampsMixin, but it's easier to test in context of existing model... :-\
        one_day_ago = datetime.datetime.today() - datetime.timedelta(days=1)
        q = query_factory.create(created_at=one_day_ago, updated_at=one_day_ago)

        q.save()

        self.assertNotEqual(q.updated_at, one_day_ago)


class ShouldScheduleNextTest(TestCase):
    def test_interval_schedule_that_needs_reschedule(self):
        now = datetime.datetime.now()
        two_hours_ago = now - datetime.timedelta(hours=2)
        self.assertTrue(models.should_schedule_next(two_hours_ago, now, "3600"))

    def test_interval_schedule_that_doesnt_need_reschedule(self):
        now = datetime.datetime.now()
        half_an_hour_ago = now - datetime.timedelta(minutes=30)
        self.assertFalse(models.should_schedule_next(half_an_hour_ago, now, "3600"))

    def test_exact_time_that_needs_reschedule(self):
        now = datetime.datetime.now()
        yesterday = now - datetime.timedelta(days=1)
        schedule = "{:02d}:00".format(now.hour - 3)
        self.assertTrue(models.should_schedule_next(yesterday, now, schedule))

    def test_exact_time_that_doesnt_need_reschedule(self):
        now = datetime.datetime.now()
        yesterday = (now - datetime.timedelta(days=1)).replace(hour=now.hour+3, minute=now.minute+1)
        schedule = "{:02d}:00".format(now.hour + 3)
        self.assertFalse(models.should_schedule_next(yesterday, now, schedule))

    def test_exact_time_with_day_change(self):
        now = datetime.datetime.now().replace(hour=0, minute=1)
        previous = (now - datetime.timedelta(days=2)).replace(hour=23, minute=59)
        schedule = "23:59".format(now.hour + 3)
        self.assertTrue(models.should_schedule_next(previous, now, schedule))


class QueryOutdatedQueriesTest(BaseTestCase):
    # TODO: this test can be refactored to use mock version of should_schedule_next to simplify it.
    def test_outdated_queries_skips_unscheduled_queries(self):
        query = query_factory.create(schedule=None)
        queries = models.Query.outdated_queries()

        self.assertNotIn(query, queries)

    def test_outdated_queries_works_with_ttl_based_schedule(self):
        two_hours_ago = datetime.datetime.now() - datetime.timedelta(hours=2)
        query = query_factory.create(schedule="3600")
        query_result = query_result_factory.create(query=query, retrieved_at=two_hours_ago)
        query.latest_query_data = query_result
        query.save()

        queries = models.Query.outdated_queries()
        self.assertIn(query, queries)

    def test_skips_fresh_queries(self):
        half_an_hour_ago = datetime.datetime.now() - datetime.timedelta(minutes=30)
        query = query_factory.create(schedule="3600")
        query_result = query_result_factory.create(query=query, retrieved_at=half_an_hour_ago)
        query.latest_query_data = query_result
        query.save()

        queries = models.Query.outdated_queries()
        self.assertNotIn(query, queries)

    def test_outdated_queries_works_with_specific_time_schedule(self):
        half_an_hour_ago = datetime.datetime.utcnow() - datetime.timedelta(minutes=30)
        query = query_factory.create(schedule=half_an_hour_ago.strftime('%H:%M'))
        query_result = query_result_factory.create(query=query, retrieved_at=half_an_hour_ago-datetime.timedelta(days=1))
        query.latest_query_data = query_result
        query.save()

        queries = models.Query.outdated_queries()
        self.assertIn(query, queries)


class QueryArchiveTest(BaseTestCase):
    def setUp(self):
        super(QueryArchiveTest, self).setUp()

    def test_archive_query_sets_flag(self):
        query = query_factory.create()
        query.archive()
        query = models.Query.get_by_id(query.id)

        self.assertEquals(query.is_archived, True)

    def test_archived_query_doesnt_return_in_all(self):
        query = query_factory.create(schedule="1")
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        query_result = models.QueryResult.store_result(query.data_source.id, query.query_hash, query.query, "1",
                                                       123, yesterday)

        query.latest_query_data = query_result
        query.save()

        self.assertIn(query, models.Query.all_queries())
        self.assertIn(query, models.Query.outdated_queries())

        query.archive()

        self.assertNotIn(query, models.Query.all_queries())
        self.assertNotIn(query, models.Query.outdated_queries())

    def test_removes_associated_widgets_from_dashboards(self):
        widget = widget_factory.create()
        query = widget.visualization.query

        query.archive()

        self.assertRaises(models.Widget.DoesNotExist, models.Widget.get_by_id, widget.id)

    def test_removes_scheduling(self):
        query = query_factory.create(schedule="1")

        query.archive()

        query = models.Query.get_by_id(query.id)

        self.assertEqual(None, query.schedule)


class DataSourceTest(BaseTestCase):
    def test_get_schema(self):
        return_value = "{}"
        with mock.patch('redash.query_runner.pg.PostgreSQL.get_schema') as patched_get_schema:
            patched_get_schema.return_value = return_value

            ds = data_source_factory.create()
            schema = ds.get_schema()

            self.assertEqual(return_value, schema)

    def test_get_schema_uses_cache(self):
        return_value = "{}"
        with mock.patch('redash.query_runner.pg.PostgreSQL.get_schema') as patched_get_schema:
            patched_get_schema.return_value = return_value

            ds = data_source_factory.create()
            ds.get_schema()
            schema = ds.get_schema()

            self.assertEqual(return_value, schema)
            self.assertEqual(patched_get_schema.call_count, 1)

    def test_get_schema_skips_cache_with_refresh_true(self):
        return_value = "{}"
        with mock.patch('redash.query_runner.pg.PostgreSQL.get_schema') as patched_get_schema:
            patched_get_schema.return_value = return_value

            ds = data_source_factory.create()
            ds.get_schema()
            new_return_value = '{"new":true}'
            patched_get_schema.return_value = new_return_value
            schema = ds.get_schema(refresh=True)

            self.assertEqual(new_return_value, schema)
            self.assertEqual(patched_get_schema.call_count, 2)


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

        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query, max_age=60)

        self.assertIsNone(found_query_result)

    def test_get_latest_returns_if_ttl_not_expired(self):
        yesterday = datetime.datetime.now() - datetime.timedelta(seconds=30)
        qr = query_result_factory.create(retrieved_at=yesterday)

        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query, max_age=120)

        self.assertEqual(found_query_result, qr)

    def test_get_latest_returns_the_most_recent_result(self):
        yesterday = datetime.datetime.now() - datetime.timedelta(seconds=30)
        old_qr = query_result_factory.create(retrieved_at=yesterday)
        qr = query_result_factory.create()

        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query, 60)

        self.assertEqual(found_query_result.id, qr.id)

    def test_get_latest_returns_the_last_cached_result_for_negative_ttl(self):
        yesterday = datetime.datetime.now() + datetime.timedelta(days=-100)
        very_old = query_result_factory.create(retrieved_at=yesterday)

        yesterday = datetime.datetime.now() + datetime.timedelta(days=-1)
        qr = query_result_factory.create(retrieved_at=yesterday)
        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query, -1)

        self.assertEqual(found_query_result.id, qr.id)


class TestUnusedQueryResults(BaseTestCase):
    def test_returns_only_unused_query_results(self):
        two_weeks_ago = datetime.datetime.now() - datetime.timedelta(days=14)
        qr = query_result_factory.create()
        query = query_factory.create(latest_query_data=qr)
        unused_qr = query_result_factory.create(retrieved_at=two_weeks_ago)

        self.assertIn(unused_qr, models.QueryResult.unused())
        self.assertNotIn(qr, models.QueryResult.unused())

    def test_returns_only_over_a_week_old_results(self):
        two_weeks_ago = datetime.datetime.now() - datetime.timedelta(days=14)
        unused_qr = query_result_factory.create(retrieved_at=two_weeks_ago)
        new_unused_qr = query_result_factory.create()

        self.assertIn(unused_qr, models.QueryResult.unused())
        self.assertNotIn(new_unused_qr, models.QueryResult.unused())


class TestQueryResultStoreResult(BaseTestCase):
    def setUp(self):
        super(TestQueryResultStoreResult, self).setUp()
        self.data_source = data_source_factory.create()
        self.query = "SELECT 1"
        self.query_hash = gen_query_hash(self.query)
        self.runtime = 123
        self.utcnow = datetime.datetime.utcnow()
        self.data = "data"

    def test_stores_the_result(self):
        query_result = models.QueryResult.store_result(self.data_source.id, self.query_hash, self.query,
                                                          self.data, self.runtime, self.utcnow)

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

        query_result = models.QueryResult.store_result(self.data_source.id, self.query_hash, self.query, self.data,
                                                       self.runtime, self.utcnow)

        self.assertEqual(models.Query.get_by_id(query1.id)._data['latest_query_data'], query_result.id)
        self.assertEqual(models.Query.get_by_id(query2.id)._data['latest_query_data'], query_result.id)
        self.assertEqual(models.Query.get_by_id(query3.id)._data['latest_query_data'], query_result.id)

    def test_doesnt_update_queries_with_different_hash(self):
        query1 = query_factory.create(query=self.query, data_source=self.data_source)
        query2 = query_factory.create(query=self.query, data_source=self.data_source)
        query3 = query_factory.create(query=self.query + "123", data_source=self.data_source)

        query_result = models.QueryResult.store_result(self.data_source.id, self.query_hash, self.query, self.data,
                                                       self.runtime, self.utcnow)

        self.assertEqual(models.Query.get_by_id(query1.id)._data['latest_query_data'], query_result.id)
        self.assertEqual(models.Query.get_by_id(query2.id)._data['latest_query_data'], query_result.id)
        self.assertNotEqual(models.Query.get_by_id(query3.id)._data['latest_query_data'], query_result.id)

    def test_doesnt_update_queries_with_different_data_source(self):
        query1 = query_factory.create(query=self.query, data_source=self.data_source)
        query2 = query_factory.create(query=self.query, data_source=self.data_source)
        query3 = query_factory.create(query=self.query, data_source=data_source_factory.create())

        query_result = models.QueryResult.store_result(self.data_source.id, self.query_hash, self.query, self.data,
                                                       self.runtime, self.utcnow)

        self.assertEqual(models.Query.get_by_id(query1.id)._data['latest_query_data'], query_result.id)
        self.assertEqual(models.Query.get_by_id(query2.id)._data['latest_query_data'], query_result.id)
        self.assertNotEqual(models.Query.get_by_id(query3.id)._data['latest_query_data'], query_result.id)


class TestEvents(BaseTestCase):
    def raw_event(self):
        timestamp = 1411778709.791
        user = user_factory.create()
        created_at = datetime.datetime.utcfromtimestamp(timestamp)
        raw_event = {"action": "view",
                      "timestamp": timestamp,
                      "object_type": "dashboard",
                      "user_id": user.id,
                      "object_id": 1}

        return raw_event, user, created_at

    def test_records_event(self):
        raw_event, user, created_at = self.raw_event()

        event = models.Event.record(raw_event)

        self.assertEqual(event.user, user)
        self.assertEqual(event.action, "view")
        self.assertEqual(event.object_type, "dashboard")
        self.assertEqual(event.object_id, 1)
        self.assertEqual(event.created_at, created_at)

    def test_records_additional_properties(self):
        raw_event, _, _ = self.raw_event()
        additional_properties = {'test': 1, 'test2': 2, 'whatever': "abc"}
        raw_event.update(additional_properties)

        event = models.Event.record(raw_event)

        self.assertDictEqual(json.loads(event.additional_properties), additional_properties)


class TestWidgetDeleteInstance(BaseTestCase):
    def test_delete_removes_from_layout(self):
        widget = widget_factory.create()
        widget2 = widget_factory.create(dashboard=widget.dashboard)
        widget.dashboard.layout = json.dumps([[widget.id, widget2.id]])
        widget.dashboard.save()
        widget.delete_instance()

        self.assertEquals(json.dumps([[widget2.id]]), widget.dashboard.layout)

    def test_delete_removes_empty_rows(self):
        widget = widget_factory.create()
        widget2 = widget_factory.create(dashboard=widget.dashboard)
        widget.dashboard.layout = json.dumps([[widget.id, widget2.id]])
        widget.dashboard.save()
        widget.delete_instance()
        widget2.delete_instance()

        self.assertEquals("[]", widget.dashboard.layout)
