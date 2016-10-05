#encoding: utf8
import datetime
import json
from unittest import TestCase
import mock
from dateutil.parser import parse as date_parse
from tests import BaseTestCase
from redash import models
from redash.utils import gen_query_hash, utcnow


class DashboardTest(BaseTestCase):
    def test_appends_suffix_to_slug_when_duplicate(self):
        d1 = self.factory.create_dashboard()
        self.assertEquals(d1.slug, 'test')

        d2 = self.factory.create_dashboard(user=d1.user)
        self.assertNotEquals(d1.slug, d2.slug)

        d3 = self.factory.create_dashboard(user=d1.user)
        self.assertNotEquals(d1.slug, d3.slug)
        self.assertNotEquals(d2.slug, d3.slug)


class QueryTest(BaseTestCase):
    def test_changing_query_text_changes_hash(self):
        q = self.factory.create_query()

        old_hash = q.query_hash
        q.update_instance(query="SELECT 2;")

        q = models.Query.get_by_id(q.id)

        self.assertNotEquals(old_hash, q.query_hash)

    def test_search_finds_in_name(self):
        q1 = self.factory.create_query(name=u"Testing seåřċħ")
        q2 = self.factory.create_query(name=u"Testing seåřċħing")
        q3 = self.factory.create_query(name=u"Testing seå řċħ")

        queries = models.Query.search(u"seåřċħ", [self.factory.default_group])

        self.assertIn(q1, queries)
        self.assertIn(q2, queries)
        self.assertNotIn(q3, queries)

    def test_search_finds_in_description(self):
        q1 = self.factory.create_query(description=u"Testing seåřċħ")
        q2 = self.factory.create_query(description=u"Testing seåřċħing")
        q3 = self.factory.create_query(description=u"Testing seå řċħ")

        queries = models.Query.search(u"seåřċħ", [self.factory.default_group])

        self.assertIn(q1, queries)
        self.assertIn(q2, queries)
        self.assertNotIn(q3, queries)

    def test_search_by_id_returns_query(self):
        q1 = self.factory.create_query(description="Testing search")
        q2 = self.factory.create_query(description="Testing searching")
        q3 = self.factory.create_query(description="Testing sea rch")

        queries = models.Query.search(str(q3.id), [self.factory.default_group])

        self.assertIn(q3, queries)
        self.assertNotIn(q1, queries)
        self.assertNotIn(q2, queries)

    def test_search_respects_groups(self):
        other_group = models.Group.create(org=self.factory.org, name="Other Group")
        ds = self.factory.create_data_source(group=other_group)

        q1 = self.factory.create_query(description="Testing search", data_source=ds)
        q2 = self.factory.create_query(description="Testing searching")
        q3 = self.factory.create_query(description="Testing sea rch")

        queries = models.Query.search("Testing", [self.factory.default_group])

        self.assertNotIn(q1, queries)
        self.assertIn(q2, queries)
        self.assertIn(q3, queries)

        queries = models.Query.search("Testing", [other_group, self.factory.default_group])
        self.assertIn(q1, queries)
        self.assertIn(q2, queries)
        self.assertIn(q3, queries)

        queries = models.Query.search("Testing", [other_group])
        self.assertIn(q1, queries)
        self.assertNotIn(q2, queries)
        self.assertNotIn(q3, queries)

    def test_returns_each_query_only_once(self):
        other_group = self.factory.create_group()
        second_group = self.factory.create_group()
        ds = self.factory.create_data_source(group=other_group)
        ds.add_group(second_group, False)

        q1 = self.factory.create_query(description="Testing search", data_source=ds)

        queries = list(models.Query.search("Testing", [self.factory.default_group, other_group, second_group]))

        self.assertEqual(1, len(queries))

    def test_save_creates_default_visualization(self):
        q = self.factory.create_query()
        self.assertEquals(q.visualizations.count(), 1)

    def test_save_updates_updated_at_field(self):
        # This should be a test of ModelTimestampsMixin, but it's easier to test in context of existing model... :-\
        one_day_ago = datetime.datetime.today() - datetime.timedelta(days=1)
        q = self.factory.create_query(created_at=one_day_ago, updated_at=one_day_ago)

        q.save()

        self.assertNotEqual(q.updated_at, one_day_ago)


class QueryRecentTest(BaseTestCase):
    def test_global_recent(self):
        q1 = self.factory.create_query()
        q2 = self.factory.create_query()

        models.Event.create(org=self.factory.org, user=self.factory.user, action="edit",
                            object_type="query", object_id=q1.id)

        recent = models.Query.recent([self.factory.default_group])

        self.assertIn(q1, recent)
        self.assertNotIn(q2, recent)

    def test_recent_for_user(self):
        q1 = self.factory.create_query()
        q2 = self.factory.create_query()

        models.Event.create(org=self.factory.org, user=self.factory.user, action="edit",
                            object_type="query", object_id=q1.id)

        recent = models.Query.recent([self.factory.default_group], user_id=self.factory.user.id)

        self.assertIn(q1, recent)
        self.assertNotIn(q2, recent)

        recent = models.Query.recent([self.factory.default_group], user_id=self.factory.user.id + 1)
        self.assertNotIn(q1, recent)
        self.assertNotIn(q2, recent)

    def test_respects_groups(self):
        q1 = self.factory.create_query()
        ds = self.factory.create_data_source(group=self.factory.create_group())
        q2 = self.factory.create_query(data_source=ds)

        models.Event.create(org=self.factory.org, user=self.factory.user, action="edit",
                            object_type="query", object_id=q1.id)
        models.Event.create(org=self.factory.org, user=self.factory.user, action="edit",
                            object_type="query", object_id=q2.id)

        recent = models.Query.recent([self.factory.default_group])

        self.assertIn(q1, recent)
        self.assertNotIn(q2, recent)


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
        scheduled_datetime = now - datetime.timedelta(hours=3)
        scheduled_time = "{:02d}:00".format(scheduled_datetime.hour)
        self.assertTrue(models.should_schedule_next(yesterday, now, scheduled_time))

    def test_exact_time_that_doesnt_need_reschedule(self):
        now = date_parse("2015-10-16 20:10")
        yesterday = date_parse("2015-10-15 23:07")
        schedule = "23:00"
        self.assertFalse(models.should_schedule_next(yesterday, now, schedule))

    def test_exact_time_with_day_change(self):
        now = datetime.datetime.now().replace(hour=0, minute=1)
        previous = (now - datetime.timedelta(days=2)).replace(hour=23, minute=59)
        schedule = "23:59".format(now.hour + 3)
        self.assertTrue(models.should_schedule_next(previous, now, schedule))


class QueryOutdatedQueriesTest(BaseTestCase):
    # TODO: this test can be refactored to use mock version of should_schedule_next to simplify it.
    def test_outdated_queries_skips_unscheduled_queries(self):
        query = self.factory.create_query(schedule=None)
        queries = models.Query.outdated_queries()

        self.assertNotIn(query, queries)

    def test_outdated_queries_works_with_ttl_based_schedule(self):
        two_hours_ago = datetime.datetime.now() - datetime.timedelta(hours=2)
        query = self.factory.create_query(schedule="3600")
        query_result = self.factory.create_query_result(query=query, retrieved_at=two_hours_ago)
        query.latest_query_data = query_result
        query.save()

        queries = models.Query.outdated_queries()
        self.assertIn(query, queries)

    def test_skips_fresh_queries(self):
        half_an_hour_ago = datetime.datetime.now() - datetime.timedelta(minutes=30)
        query = self.factory.create_query(schedule="3600")
        query_result = self.factory.create_query_result(query=query, retrieved_at=half_an_hour_ago)
        query.latest_query_data = query_result
        query.save()

        queries = models.Query.outdated_queries()
        self.assertNotIn(query, queries)

    def test_outdated_queries_works_with_specific_time_schedule(self):
        half_an_hour_ago = utcnow() - datetime.timedelta(minutes=30)
        query = self.factory.create_query(schedule=half_an_hour_ago.strftime('%H:%M'))
        query_result = self.factory.create_query_result(query=query, retrieved_at=half_an_hour_ago - datetime.timedelta(days=1))
        query.latest_query_data = query_result
        query.save()

        queries = models.Query.outdated_queries()
        self.assertIn(query, queries)


class QueryArchiveTest(BaseTestCase):
    def setUp(self):
        super(QueryArchiveTest, self).setUp()

    def test_archive_query_sets_flag(self):
        query = self.factory.create_query()
        query.archive()
        query = models.Query.get_by_id(query.id)

        self.assertEquals(query.is_archived, True)

    def test_archived_query_doesnt_return_in_all(self):
        query = self.factory.create_query(schedule="1")
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        query_result, _ = models.QueryResult.store_result(query.org, query.data_source.id, query.query_hash, query.query, "1",
                                                       123, yesterday)

        query.latest_query_data = query_result
        query.save()

        self.assertIn(query, list(models.Query.all_queries(query.groups.keys())))
        self.assertIn(query, models.Query.outdated_queries())

        query.archive()

        self.assertNotIn(query, list(models.Query.all_queries(query.groups.keys())))
        self.assertNotIn(query, models.Query.outdated_queries())

    def test_removes_associated_widgets_from_dashboards(self):
        widget = self.factory.create_widget()
        query = widget.visualization.query

        query.archive()

        self.assertRaises(models.Widget.DoesNotExist, models.Widget.get_by_id, widget.id)

    def test_removes_scheduling(self):
        query = self.factory.create_query(schedule="1")

        query.archive()

        query = models.Query.get_by_id(query.id)

        self.assertEqual(None, query.schedule)

    def test_deletes_alerts(self):
        subscription = self.factory.create_alert_subscription()
        query = subscription.alert.query

        query.archive()

        self.assertRaises(models.Alert.DoesNotExist, models.Alert.get_by_id, subscription.alert.id)
        self.assertRaises(models.AlertSubscription.DoesNotExist, models.AlertSubscription.get_by_id, subscription.id)


class DataSourceTest(BaseTestCase):
    def test_get_schema(self):
        return_value = [{'name': 'table', 'columns': []}]

        with mock.patch('redash.query_runner.pg.PostgreSQL.get_schema') as patched_get_schema:
            patched_get_schema.return_value = return_value

            schema = self.factory.data_source.get_schema()

            self.assertEqual(return_value, schema)

    def test_get_schema_uses_cache(self):
        return_value = [{'name': 'table', 'columns': []}]
        with mock.patch('redash.query_runner.pg.PostgreSQL.get_schema') as patched_get_schema:
            patched_get_schema.return_value = return_value

            self.factory.data_source.get_schema()
            schema = self.factory.data_source.get_schema()

            self.assertEqual(return_value, schema)
            self.assertEqual(patched_get_schema.call_count, 1)

    def test_get_schema_skips_cache_with_refresh_true(self):
        return_value = [{'name': 'table', 'columns': []}]
        with mock.patch('redash.query_runner.pg.PostgreSQL.get_schema') as patched_get_schema:
            patched_get_schema.return_value = return_value

            self.factory.data_source.get_schema()
            new_return_value = [{'name': 'new_table', 'columns': []}]
            patched_get_schema.return_value = new_return_value
            schema = self.factory.data_source.get_schema(refresh=True)

            self.assertEqual(new_return_value, schema)
            self.assertEqual(patched_get_schema.call_count, 2)


class QueryResultTest(BaseTestCase):
    def setUp(self):
        super(QueryResultTest, self).setUp()

    def test_get_latest_returns_none_if_not_found(self):
        found_query_result = models.QueryResult.get_latest(self.factory.data_source, "SELECT 1", 60)
        self.assertIsNone(found_query_result)

    def test_get_latest_returns_when_found(self):
        qr = self.factory.create_query_result()
        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query, 60)

        self.assertEqual(qr, found_query_result)

    def test_get_latest_works_with_data_source_id(self):
        qr = self.factory.create_query_result()
        found_query_result = models.QueryResult.get_latest(qr.data_source.id, qr.query, 60)

        self.assertEqual(qr, found_query_result)

    def test_get_latest_doesnt_return_query_from_different_data_source(self):
        qr = self.factory.create_query_result()
        data_source = self.factory.create_data_source()
        found_query_result = models.QueryResult.get_latest(data_source, qr.query, 60)

        self.assertIsNone(found_query_result)

    def test_get_latest_doesnt_return_if_ttl_expired(self):
        yesterday = datetime.datetime.now() - datetime.timedelta(days=1)
        qr = self.factory.create_query_result(retrieved_at=yesterday)

        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query, max_age=60)

        self.assertIsNone(found_query_result)

    def test_get_latest_returns_if_ttl_not_expired(self):
        yesterday = datetime.datetime.now() - datetime.timedelta(seconds=30)
        qr = self.factory.create_query_result(retrieved_at=yesterday)

        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query, max_age=120)

        self.assertEqual(found_query_result, qr)

    def test_get_latest_returns_the_most_recent_result(self):
        yesterday = datetime.datetime.now() - datetime.timedelta(seconds=30)
        old_qr = self.factory.create_query_result(retrieved_at=yesterday)
        qr = self.factory.create_query_result()

        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query, 60)

        self.assertEqual(found_query_result.id, qr.id)

    def test_get_latest_returns_the_last_cached_result_for_negative_ttl(self):
        yesterday = datetime.datetime.now() + datetime.timedelta(days=-100)
        very_old = self.factory.create_query_result(retrieved_at=yesterday)

        yesterday = datetime.datetime.now() + datetime.timedelta(days=-1)
        qr = self.factory.create_query_result(retrieved_at=yesterday)
        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query, -1)

        self.assertEqual(found_query_result.id, qr.id)


class TestUnusedQueryResults(BaseTestCase):
    def test_returns_only_unused_query_results(self):
        two_weeks_ago = datetime.datetime.now() - datetime.timedelta(days=14)
        qr = self.factory.create_query_result()
        query = self.factory.create_query(latest_query_data=qr)
        unused_qr = self.factory.create_query_result(retrieved_at=two_weeks_ago)

        self.assertIn(unused_qr, models.QueryResult.unused())
        self.assertNotIn(qr, models.QueryResult.unused())

    def test_returns_only_over_a_week_old_results(self):
        two_weeks_ago = datetime.datetime.now() - datetime.timedelta(days=14)
        unused_qr = self.factory.create_query_result(retrieved_at=two_weeks_ago)
        new_unused_qr = self.factory.create_query_result()

        self.assertIn(unused_qr, models.QueryResult.unused())
        self.assertNotIn(new_unused_qr, models.QueryResult.unused())


class TestQueryAll(BaseTestCase):
    def test_returns_only_queries_in_given_groups(self):
        ds1 = self.factory.create_data_source()
        ds2 = self.factory.create_data_source()

        group1 = models.Group.create(name="g1", org=ds1.org)
        group2 = models.Group.create(name="g2", org=ds1.org)

        models.DataSourceGroup.create(group=group1, data_source=ds1, permissions=['create', 'view'])
        models.DataSourceGroup.create(group=group2, data_source=ds2, permissions=['create', 'view'])

        q1 = self.factory.create_query(data_source=ds1)
        q2 = self.factory.create_query(data_source=ds2)

        self.assertIn(q1, list(models.Query.all_queries([group1])))
        self.assertNotIn(q2, list(models.Query.all_queries([group1])))
        self.assertIn(q1, list(models.Query.all_queries([group1, group2])))
        self.assertIn(q2, list(models.Query.all_queries([group1, group2])))


class TestUser(BaseTestCase):
    def test_default_group_always_added(self):
        user = self.factory.create_user()

        user.update_group_assignments(["g_unknown"])
        self.assertItemsEqual([user.org.default_group.id], user.groups)

    def test_update_group_assignments(self):
        user = self.factory.user
        new_group = models.Group.create(id='999', name="g1", org=user.org)

        user.update_group_assignments(["g1"])
        self.assertItemsEqual([user.org.default_group.id, new_group.id], user.groups)


class TestGroup(BaseTestCase):
    def test_returns_groups_with_specified_names(self):
        org1 = self.factory.create_org()
        org2 = self.factory.create_org()

        matching_group1 = models.Group.create(id='999', name="g1", org=org1)
        matching_group2 = models.Group.create(id='888', name="g2", org=org1)
        non_matching_group = models.Group.create(id='777', name="g1", org=org2)

        groups = models.Group.find_by_name(org1, ["g1", "g2"])
        self.assertIn(matching_group1, groups)
        self.assertIn(matching_group2, groups)
        self.assertNotIn(non_matching_group, groups)

    def test_returns_no_groups(self):
        org1 = self.factory.create_org()

        models.Group.create(id='999', name="g1", org=org1)
        self.assertEqual([], models.Group.find_by_name(org1, ["non-existing"]))


class TestQueryResultStoreResult(BaseTestCase):
    def setUp(self):
        super(TestQueryResultStoreResult, self).setUp()
        self.data_source = self.factory.data_source
        self.query = "SELECT 1"
        self.query_hash = gen_query_hash(self.query)
        self.runtime = 123
        self.utcnow = utcnow()
        self.data = "data"

    def test_stores_the_result(self):
        query_result, _ = models.QueryResult.store_result(self.data_source.org_id, self.data_source.id, self.query_hash,
                                                          self.query,
                                                          self.data, self.runtime, self.utcnow)

        self.assertEqual(query_result.data, self.data)
        self.assertEqual(query_result.runtime, self.runtime)
        self.assertEqual(query_result.retrieved_at, self.utcnow)
        self.assertEqual(query_result.query, self.query)
        self.assertEqual(query_result.query_hash, self.query_hash)
        self.assertEqual(query_result.data_source, self.data_source)

    def test_updates_existing_queries(self):
        query1 = self.factory.create_query(query=self.query)
        query2 = self.factory.create_query(query=self.query)
        query3 = self.factory.create_query(query=self.query)

        query_result, _ = models.QueryResult.store_result(self.data_source.org_id, self.data_source.id, self.query_hash,
                                                          self.query, self.data,
                                                          self.runtime, self.utcnow)

        self.assertEqual(models.Query.get_by_id(query1.id)._data['latest_query_data'], query_result.id)
        self.assertEqual(models.Query.get_by_id(query2.id)._data['latest_query_data'], query_result.id)
        self.assertEqual(models.Query.get_by_id(query3.id)._data['latest_query_data'], query_result.id)

    def test_doesnt_update_queries_with_different_hash(self):
        query1 = self.factory.create_query(query=self.query)
        query2 = self.factory.create_query(query=self.query)
        query3 = self.factory.create_query(query=self.query + "123")

        query_result, _ = models.QueryResult.store_result(self.data_source.org_id, self.data_source.id, self.query_hash,
                                                          self.query, self.data,
                                                          self.runtime, self.utcnow)

        self.assertEqual(models.Query.get_by_id(query1.id)._data['latest_query_data'], query_result.id)
        self.assertEqual(models.Query.get_by_id(query2.id)._data['latest_query_data'], query_result.id)
        self.assertNotEqual(models.Query.get_by_id(query3.id)._data['latest_query_data'], query_result.id)

    def test_doesnt_update_queries_with_different_data_source(self):
        query1 = self.factory.create_query(query=self.query)
        query2 = self.factory.create_query(query=self.query)
        query3 = self.factory.create_query(query=self.query, data_source=self.factory.create_data_source())

        query_result, _ = models.QueryResult.store_result(self.data_source.org_id, self.data_source.id, self.query_hash,
                                                          self.query, self.data,
                                                          self.runtime, self.utcnow)

        self.assertEqual(models.Query.get_by_id(query1.id)._data['latest_query_data'], query_result.id)
        self.assertEqual(models.Query.get_by_id(query2.id)._data['latest_query_data'], query_result.id)
        self.assertNotEqual(models.Query.get_by_id(query3.id)._data['latest_query_data'], query_result.id)


class TestEvents(BaseTestCase):
    def raw_event(self):
        timestamp = 1411778709.791
        user = self.factory.user
        created_at = datetime.datetime.utcfromtimestamp(timestamp)
        raw_event = {"action": "view",
                      "timestamp": timestamp,
                      "object_type": "dashboard",
                      "user_id": user.id,
                      "object_id": 1,
                      "org_id": 1}

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
        widget = self.factory.create_widget()
        widget2 = self.factory.create_widget(dashboard=widget.dashboard)
        widget.dashboard.layout = json.dumps([[widget.id, widget2.id]])
        widget.dashboard.save()
        widget.delete_instance()

        self.assertEquals(json.dumps([[widget2.id]]), widget.dashboard.layout)

    def test_delete_removes_empty_rows(self):
        widget = self.factory.create_widget()
        widget2 = self.factory.create_widget(dashboard=widget.dashboard)
        widget.dashboard.layout = json.dumps([[widget.id, widget2.id]])
        widget.dashboard.save()
        widget.delete_instance()
        widget2.delete_instance()

        self.assertEquals("[]", widget.dashboard.layout)


def _set_up_dashboard_test(d):
    d.g1 = d.factory.create_group(name='First')
    d.g2 = d.factory.create_group(name='Second')
    d.ds1 = d.factory.create_data_source()
    d.ds2 = d.factory.create_data_source()
    d.u1 = d.factory.create_user(groups=[d.g1.id])
    d.u2 = d.factory.create_user(groups=[d.g2.id])
    models.DataSourceGroup.create(group=d.g1, data_source=d.ds1, permissions=['create', 'view'])
    models.DataSourceGroup.create(group=d.g2, data_source=d.ds2, permissions=['create', 'view'])
    d.q1 = d.factory.create_query(data_source=d.ds1)
    d.q2 = d.factory.create_query(data_source=d.ds2)
    d.v1 = d.factory.create_visualization(query=d.q1)
    d.v2 = d.factory.create_visualization(query=d.q2)
    d.w1 = d.factory.create_widget(visualization=d.v1)
    d.w2 = d.factory.create_widget(visualization=d.v2)
    d.w3 = d.factory.create_widget(visualization=d.v2, dashboard=d.w2.dashboard)
    d.w4 = d.factory.create_widget(visualization=d.v2)
    d.w5 = d.factory.create_widget(visualization=d.v1, dashboard=d.w4.dashboard)


class TestDashboardAll(BaseTestCase):
    def setUp(self):
        super(TestDashboardAll, self).setUp()
        _set_up_dashboard_test(self)

    def test_requires_group_or_user_id(self):
        d1 = self.factory.create_dashboard()

        self.assertNotIn(d1, models.Dashboard.all(d1.user.org, d1.user.groups, None))
        self.assertIn(d1, models.Dashboard.all(d1.user.org, [0], d1.user.id))

    def test_returns_dashboards_based_on_groups(self):
        self.assertIn(self.w1.dashboard, models.Dashboard.all(self.u1.org, self.u1.groups, None))
        self.assertIn(self.w2.dashboard, models.Dashboard.all(self.u2.org, self.u2.groups, None))
        self.assertNotIn(self.w1.dashboard, models.Dashboard.all(self.u2.org, self.u2.groups, None))
        self.assertNotIn(self.w2.dashboard, models.Dashboard.all(self.u1.org, self.u1.groups, None))

    def test_returns_each_dashboard_once(self):
        dashboards = list(models.Dashboard.all(self.u2.org, self.u2.groups, None))
        self.assertEqual(len(dashboards), 2)

    def test_returns_dashboard_you_have_partial_access_to(self):
        self.assertIn(self.w5.dashboard, models.Dashboard.all(self.u1.org, self.u1.groups, None))

    def test_returns_dashboards_created_by_user(self):
        d1 = self.factory.create_dashboard(user=self.u1)

        self.assertIn(d1, models.Dashboard.all(self.u1.org, self.u1.groups, self.u1.id))
        self.assertIn(d1, models.Dashboard.all(self.u1.org, [0], self.u1.id))
        self.assertNotIn(d1, models.Dashboard.all(self.u2.org, self.u2.groups, self.u2.id))

    def test_returns_dashboards_with_text_widgets(self):
        w1 = self.factory.create_widget(visualization=None)

        self.assertIn(w1.dashboard, models.Dashboard.all(self.u1.org, self.u1.groups, None))
        self.assertIn(w1.dashboard, models.Dashboard.all(self.u2.org, self.u2.groups, None))

    def test_returns_dashboards_from_current_org_only(self):
        w1 = self.factory.create_widget(visualization=None)

        user = self.factory.create_user(org=self.factory.create_org())

        self.assertIn(w1.dashboard, models.Dashboard.all(self.u1.org, self.u1.groups, None))
        self.assertNotIn(w1.dashboard, models.Dashboard.all(user.org, user.groups, None))


class TestDashboardRecent(BaseTestCase):
    def setUp(self):
        super(TestDashboardRecent, self).setUp()
        _set_up_dashboard_test(self)

    def test_returns_recent_dashboards_basic(self):
        models.Event.create(org=self.factory.org, user=self.u1, action="view",
                            object_type="dashboard", object_id=self.w1.dashboard.id)

        self.assertIn(self.w1.dashboard, models.Dashboard.recent(self.u1.org, self.u1.groups, None))
        self.assertNotIn(self.w2.dashboard, models.Dashboard.recent(self.u1.org, self.u1.groups, None))
        self.assertNotIn(self.w1.dashboard, models.Dashboard.recent(self.u1.org, self.u2.groups, None))

    def test_returns_recent_dashboards_created_by_user(self):
        d1 = self.factory.create_dashboard(user=self.u1)
        models.Event.create(org=self.factory.org, user=self.u1, action="view",
                            object_type="dashboard", object_id=d1.id)

        self.assertIn(d1, models.Dashboard.recent(self.u1.org, [0], self.u1.id))
        self.assertNotIn(self.w2.dashboard, models.Dashboard.recent(self.u1.org, [0], self.u1.id))
        self.assertNotIn(d1, models.Dashboard.recent(self.u2.org, [0], self.u2.id))

    def test_returns_recent_dashboards_with_no_visualizations(self):
        w1 = self.factory.create_widget(visualization=None)
        models.Event.create(org=self.factory.org, user=self.u1, action="view",
                            object_type="dashboard", object_id=w1.dashboard.id)

        self.assertIn(w1.dashboard, models.Dashboard.recent(self.u1.org, [0], self.u1.id))
        self.assertNotIn(self.w2.dashboard, models.Dashboard.recent(self.u1.org, [0], self.u1.id))

    def test_restricts_dashboards_for_user(self):
        models.Event.create(org=self.factory.org, user=self.u1, action="view",
                            object_type="dashboard", object_id=self.w1.dashboard.id)
        models.Event.create(org=self.factory.org, user=self.u2, action="view",
                            object_type="dashboard", object_id=self.w2.dashboard.id)
        models.Event.create(org=self.factory.org, user=self.u1, action="view",
                            object_type="dashboard", object_id=self.w5.dashboard.id)
        models.Event.create(org=self.factory.org, user=self.u2, action="view",
                            object_type="dashboard", object_id=self.w5.dashboard.id)

        self.assertIn(self.w1.dashboard, models.Dashboard.recent(self.u1.org, self.u1.groups, self.u1.id, for_user=True))
        self.assertIn(self.w2.dashboard, models.Dashboard.recent(self.u2.org, self.u2.groups, self.u2.id, for_user=True))
        self.assertNotIn(self.w1.dashboard, models.Dashboard.recent(self.u2.org, self.u2.groups, self.u2.id, for_user=True))
        self.assertNotIn(self.w2.dashboard, models.Dashboard.recent(self.u1.org, self.u1.groups, self.u1.id, for_user=True))
        self.assertIn(self.w5.dashboard, models.Dashboard.recent(self.u1.org, self.u1.groups, self.u1.id, for_user=True))
        self.assertIn(self.w5.dashboard, models.Dashboard.recent(self.u2.org, self.u2.groups, self.u2.id, for_user=True))

    def test_returns_each_dashboard_once(self):
        models.Event.create(org=self.factory.org, user=self.u1, action="view",
                            object_type="dashboard", object_id=self.w1.dashboard.id)
        models.Event.create(org=self.factory.org, user=self.u1, action="view",
                            object_type="dashboard", object_id=self.w1.dashboard.id)

        dashboards = list(models.Dashboard.recent(self.u1.org, self.u1.groups, None))
        self.assertEqual(len(dashboards), 1)

    def test_returns_dashboards_from_current_org_only(self):
        w1 = self.factory.create_widget(visualization=None)
        models.Event.create(org=self.factory.org, user=self.u1, action="view",
                            object_type="dashboard", object_id=w1.dashboard.id)

        user = self.factory.create_user(org=self.factory.create_org())

        self.assertIn(w1.dashboard, models.Dashboard.recent(self.u1.org, self.u1.groups, None))
        self.assertNotIn(w1.dashboard, models.Dashboard.recent(user.org, user.groups, None))
