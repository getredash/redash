import calendar
import datetime
from unittest import TestCase

from dateutil.parser import parse as date_parse

from redash import models
from redash.models import db
from redash.utils import gen_query_hash, utcnow
from tests import BaseTestCase


class DashboardTest(BaseTestCase):
    def test_appends_suffix_to_slug_when_duplicate(self):
        d1 = self.factory.create_dashboard()
        db.session.flush()
        self.assertEqual(d1.slug, "test")

        d2 = self.factory.create_dashboard(user=d1.user)
        db.session.flush()
        self.assertNotEqual(d1.slug, d2.slug)

        d3 = self.factory.create_dashboard(user=d1.user)
        db.session.flush()
        self.assertNotEqual(d1.slug, d3.slug)
        self.assertNotEqual(d2.slug, d3.slug)


class ShouldScheduleNextTest(TestCase):
    def test_interval_schedule_that_needs_reschedule(self):
        now = utcnow()
        two_hours_ago = now - datetime.timedelta(hours=2)
        self.assertTrue(models.should_schedule_next(two_hours_ago, now, "3600"))

    def test_interval_schedule_that_doesnt_need_reschedule(self):
        now = utcnow()
        half_an_hour_ago = now - datetime.timedelta(minutes=30)
        self.assertFalse(models.should_schedule_next(half_an_hour_ago, now, "3600"))

    def test_exact_time_that_needs_reschedule(self):
        now = utcnow()
        yesterday = now - datetime.timedelta(days=1)
        scheduled_datetime = now - datetime.timedelta(hours=3)
        scheduled_time = "{:02d}:00".format(scheduled_datetime.hour)
        self.assertTrue(models.should_schedule_next(yesterday, now, "86400", scheduled_time))

    def test_exact_time_that_doesnt_need_reschedule(self):
        now = date_parse("2015-10-16 20:10")
        yesterday = date_parse("2015-10-15 23:07")
        schedule = "23:00"
        self.assertFalse(models.should_schedule_next(yesterday, now, "86400", schedule))

    def test_exact_time_with_day_change(self):
        now = utcnow().replace(hour=0, minute=1)
        previous = (now - datetime.timedelta(days=2)).replace(hour=23, minute=59)
        schedule = "23:59"
        self.assertTrue(models.should_schedule_next(previous, now, "86400", schedule))

    def test_exact_time_every_x_days_that_needs_reschedule(self):
        now = utcnow()
        four_days_ago = now - datetime.timedelta(days=4)
        three_day_interval = "259200"
        scheduled_datetime = now - datetime.timedelta(hours=3)
        scheduled_time = "{:02d}:00".format(scheduled_datetime.hour)
        self.assertTrue(models.should_schedule_next(four_days_ago, now, three_day_interval, scheduled_time))

    def test_exact_time_every_x_days_that_doesnt_need_reschedule(self):
        now = utcnow()
        four_days_ago = now - datetime.timedelta(days=2)
        three_day_interval = "259200"
        scheduled_datetime = now - datetime.timedelta(hours=3)
        scheduled_time = "{:02d}:00".format(scheduled_datetime.hour)
        self.assertFalse(models.should_schedule_next(four_days_ago, now, three_day_interval, scheduled_time))

    def test_exact_time_every_x_days_with_day_change(self):
        now = utcnow().replace(hour=23, minute=59)
        previous = (now - datetime.timedelta(days=2)).replace(hour=0, minute=1)
        schedule = "23:58"
        three_day_interval = "259200"
        self.assertTrue(models.should_schedule_next(previous, now, three_day_interval, schedule))

    def test_exact_time_every_x_weeks_that_needs_reschedule(self):
        # Setup:
        #
        # 1) The query should run every 3 weeks on Tuesday
        # 2) The last time it ran was 3 weeks ago from this week's Thursday
        # 3) It is now Wednesday of this week
        #
        # Expectation: Even though less than 3 weeks have passed since the
        #              last run 3 weeks ago on Thursday, it's overdue since
        #              it should be running on Tuesdays.
        this_thursday = utcnow() + datetime.timedelta(
            days=list(calendar.day_name).index("Thursday") - utcnow().weekday()
        )
        three_weeks_ago = this_thursday - datetime.timedelta(weeks=3)
        now = this_thursday - datetime.timedelta(days=1)
        three_week_interval = "1814400"
        scheduled_datetime = now - datetime.timedelta(hours=3)
        scheduled_time = "{:02d}:00".format(scheduled_datetime.hour)
        self.assertTrue(
            models.should_schedule_next(three_weeks_ago, now, three_week_interval, scheduled_time, "Tuesday")
        )

    def test_exact_time_every_x_weeks_that_doesnt_need_reschedule(self):
        # Setup:
        #
        # 1) The query should run every 3 weeks on Thurday
        # 2) The last time it ran was 3 weeks ago from this week's Tuesday
        # 3) It is now Wednesday of this week
        #
        # Expectation: Even though more than 3 weeks have passed since the
        #              last run 3 weeks ago on Tuesday, it's not overdue since
        #              it should be running on Thursdays.
        this_tuesday = utcnow() + datetime.timedelta(
            days=list(calendar.day_name).index("Tuesday") - utcnow().weekday()
        )
        three_weeks_ago = this_tuesday - datetime.timedelta(weeks=3)
        now = this_tuesday + datetime.timedelta(days=1)
        three_week_interval = "1814400"
        scheduled_datetime = now - datetime.timedelta(hours=3)
        scheduled_time = "{:02d}:00".format(scheduled_datetime.hour)
        self.assertFalse(
            models.should_schedule_next(three_weeks_ago, now, three_week_interval, scheduled_time, "Thursday")
        )

    def test_backoff(self):
        now = utcnow()
        two_hours_ago = now - datetime.timedelta(hours=2)
        self.assertTrue(models.should_schedule_next(two_hours_ago, now, "3600", failures=5))
        self.assertFalse(models.should_schedule_next(two_hours_ago, now, "3600", failures=10))

    def test_next_iteration_overflow(self):
        now = utcnow()
        two_hours_ago = now - datetime.timedelta(hours=2)
        self.assertFalse(models.should_schedule_next(two_hours_ago, now, "3600", failures=32))


class QueryOutdatedQueriesTest(BaseTestCase):
    def schedule(self, **kwargs):
        schedule = {"interval": None, "time": None, "until": None, "day_of_week": None}
        schedule.update(**kwargs)
        return schedule

    def create_scheduled_query(self, **kwargs):
        return self.factory.create_query(schedule=self.schedule(**kwargs))

    def fake_previous_execution(self, query, **kwargs):
        retrieved_at = utcnow() - datetime.timedelta(**kwargs)
        query_result = self.factory.create_query_result(
            retrieved_at=retrieved_at,
            query_text=query.query_text,
            query_hash=query.query_hash,
        )
        query.latest_query_data = query_result

    # TODO: this test can be refactored to use mock version of should_schedule_next to simplify it.
    def test_outdated_queries_skips_unscheduled_queries(self):
        query = self.create_scheduled_query()
        query_with_none = self.factory.create_query(schedule=None)

        queries = models.Query.outdated_queries()

        self.assertNotIn(query, queries)
        self.assertNotIn(query_with_none, queries)

    def test_outdated_queries_works_with_ttl_based_schedule(self):
        query = self.create_scheduled_query(interval="3600")
        self.fake_previous_execution(query, hours=2)

        queries = models.Query.outdated_queries()

        self.assertIn(query, queries)

    def test_outdated_queries_works_scheduled_queries_tracker(self):
        query = self.create_scheduled_query(interval="3600")
        self.fake_previous_execution(query, hours=2)
        models.scheduled_queries_executions.update(query.id)

        queries = models.Query.outdated_queries()

        self.assertNotIn(query, queries)

    def test_skips_fresh_queries(self):
        query = self.create_scheduled_query(interval="3600")
        self.fake_previous_execution(query, minutes=30)

        queries = models.Query.outdated_queries()

        self.assertNotIn(query, queries)

    def test_outdated_queries_works_with_specific_time_schedule(self):
        half_an_hour_ago = utcnow() - datetime.timedelta(minutes=30)
        query = self.create_scheduled_query(interval="86400", time=half_an_hour_ago.strftime("%H:%M"))
        query_result = self.factory.create_query_result(
            query=query.query_text,
            retrieved_at=half_an_hour_ago - datetime.timedelta(days=1),
        )
        query.latest_query_data = query_result

        queries = models.Query.outdated_queries()
        self.assertIn(query, queries)

    def test_enqueues_query_only_once(self):
        """
        Only one query per data source with the same text will be reported by
        Query.outdated_queries().
        """
        query = self.create_scheduled_query(interval="60")
        query2 = self.factory.create_query(
            schedule=self.schedule(interval="60"),
            query_text=query.query_text,
            query_hash=query.query_hash,
        )
        self.fake_previous_execution(query, minutes=10)
        self.fake_previous_execution(query2, minutes=10)

        self.assertEqual(list(models.Query.outdated_queries()), [query2])

    def test_enqueues_query_with_correct_data_source(self):
        """
        Queries from different data sources will be reported by
        Query.outdated_queries() even if they have the same query text.
        """
        query = self.factory.create_query(
            schedule=self.schedule(interval="60"),
            data_source=self.factory.create_data_source(),
        )
        query2 = self.factory.create_query(
            schedule=self.schedule(interval="60"),
            query_text=query.query_text,
            query_hash=query.query_hash,
        )
        self.fake_previous_execution(query, minutes=10)
        self.fake_previous_execution(query2, minutes=10)

        outdated_queries = models.Query.outdated_queries()
        self.assertEqual(len(outdated_queries), 2)
        self.assertIn(query, outdated_queries)
        self.assertIn(query2, outdated_queries)

    def test_enqueues_only_for_relevant_data_source(self):
        """
        If multiple queries with the same text exist, only ones that are
        scheduled to be refreshed are reported by Query.outdated_queries().
        """
        query = self.create_scheduled_query(interval="60")
        query2 = self.factory.create_query(
            schedule=self.schedule(interval="3600"),
            query_text=query.query_text,
            query_hash=query.query_hash,
        )
        self.fake_previous_execution(query, minutes=10)
        self.fake_previous_execution(query2, minutes=10)

        self.assertEqual(list(models.Query.outdated_queries()), [query])

    def test_failure_extends_schedule(self):
        """
        Execution failures recorded for a query result in exponential backoff
        for scheduling future execution.
        """
        query = self.factory.create_query(
            schedule=self.schedule(interval="60"),
            schedule_failures=4,
        )
        self.fake_previous_execution(query, minutes=16)

        self.assertEqual(list(models.Query.outdated_queries()), [])

        self.fake_previous_execution(query, minutes=17)
        self.assertEqual(list(models.Query.outdated_queries()), [query])

    def test_schedule_until_after(self):
        """
        Queries with non-null ``schedule['until']`` are not reported by
        Query.outdated_queries() after the given time is past.
        """
        one_day_ago = (utcnow() - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        query = self.create_scheduled_query(interval="3600", until=one_day_ago)
        self.fake_previous_execution(query, hours=2)

        queries = models.Query.outdated_queries()

        self.assertNotIn(query, queries)

    def test_schedule_until_before(self):
        """
        Queries with non-null ``schedule['until']`` are reported by
        Query.outdated_queries() before the given time is past.
        """
        one_day_from_now = (utcnow() + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        query = self.create_scheduled_query(interval="3600", until=one_day_from_now)
        self.fake_previous_execution(query, hours=2)

        queries = models.Query.outdated_queries()

        self.assertIn(query, queries)

    def test_skips_and_disables_faulty_queries(self):
        faulty_query = self.create_scheduled_query(until="pigs fly")
        valid_query = self.create_scheduled_query(interval="60")
        self.fake_previous_execution(valid_query, minutes=10)

        models.Query.outdated_queries()

        self.assertEqual(list(models.Query.outdated_queries()), [valid_query])
        self.assertTrue(faulty_query.schedule.get("disabled"))

    def test_skips_disabled_schedules(self):
        query = self.create_scheduled_query(disabled=True)
        queries = models.Query.outdated_queries()
        self.assertNotIn(query, queries)


class QueryArchiveTest(BaseTestCase):
    def test_archive_query_sets_flag(self):
        query = self.factory.create_query()
        db.session.flush()
        query.archive()

        self.assertEqual(query.is_archived, True)

    def test_archived_query_doesnt_return_in_all(self):
        query = self.factory.create_query(schedule={"interval": "1", "until": None, "time": None, "day_of_week": None})
        yesterday = utcnow() - datetime.timedelta(days=1)
        query_result = models.QueryResult.store_result(
            query.org_id,
            query.data_source,
            query.query_hash,
            query.query_text,
            {"columns": {}, "rows": []},
            123,
            yesterday,
        )

        query.latest_query_data = query_result
        groups = list(models.Group.query.filter(models.Group.id.in_(query.groups)))
        self.assertIn(query, list(models.Query.all_queries([g.id for g in groups])))
        self.assertIn(query, models.Query.outdated_queries())
        db.session.flush()
        query.archive()

        self.assertNotIn(query, list(models.Query.all_queries([g.id for g in groups])))
        self.assertNotIn(query, models.Query.outdated_queries())

    def test_removes_associated_widgets_from_dashboards(self):
        widget = self.factory.create_widget()
        query = widget.visualization.query_rel
        db.session.commit()
        query.archive()
        db.session.flush()
        self.assertEqual(models.Widget.query.get(widget.id), None)

    def test_removes_scheduling(self):
        query = self.factory.create_query(schedule={"interval": "1", "until": None, "time": None, "day_of_week": None})

        query.archive()

        self.assertIsNone(query.schedule)

    def test_deletes_alerts(self):
        subscription = self.factory.create_alert_subscription()
        query = subscription.alert.query_rel
        db.session.commit()
        query.archive()
        db.session.flush()
        self.assertEqual(models.Alert.query.get(subscription.alert.id), None)
        self.assertEqual(models.AlertSubscription.query.get(subscription.id), None)


class TestUnusedQueryResults(BaseTestCase):
    def test_returns_only_unused_query_results(self):
        two_weeks_ago = utcnow() - datetime.timedelta(days=14)
        qr = self.factory.create_query_result()
        self.factory.create_query(latest_query_data=qr)
        db.session.flush()
        unused_qr = self.factory.create_query_result(retrieved_at=two_weeks_ago)
        self.assertIn(unused_qr, list(models.QueryResult.unused()))
        self.assertNotIn(qr, list(models.QueryResult.unused()))

    def test_returns_only_over_a_week_old_results(self):
        two_weeks_ago = utcnow() - datetime.timedelta(days=14)
        unused_qr = self.factory.create_query_result(retrieved_at=two_weeks_ago)
        db.session.flush()
        new_unused_qr = self.factory.create_query_result()

        self.assertIn(unused_qr, list(models.QueryResult.unused()))
        self.assertNotIn(new_unused_qr, list(models.QueryResult.unused()))


class TestQueryAll(BaseTestCase):
    def test_returns_only_queries_in_given_groups(self):
        ds1 = self.factory.create_data_source()
        ds2 = self.factory.create_data_source()

        group1 = models.Group(name="g1", org=ds1.org, permissions=["create", "view"])
        group2 = models.Group(name="g2", org=ds1.org, permissions=["create", "view"])

        q1 = self.factory.create_query(data_source=ds1)
        q2 = self.factory.create_query(data_source=ds2)

        db.session.add_all(
            [
                ds1,
                ds2,
                group1,
                group2,
                q1,
                q2,
                models.DataSourceGroup(group=group1, data_source=ds1),
                models.DataSourceGroup(group=group2, data_source=ds2),
            ]
        )
        db.session.flush()
        self.assertIn(q1, list(models.Query.all_queries([group1.id])))
        self.assertNotIn(q2, list(models.Query.all_queries([group1.id])))
        self.assertIn(q1, list(models.Query.all_queries([group1.id, group2.id])))
        self.assertIn(q2, list(models.Query.all_queries([group1.id, group2.id])))

    def test_skips_drafts(self):
        q = self.factory.create_query(is_draft=True)
        self.assertNotIn(q, models.Query.all_queries([self.factory.default_group.id]))

    def test_includes_drafts_of_given_user(self):
        q = self.factory.create_query(is_draft=True)
        self.assertIn(
            q,
            models.Query.all_queries([self.factory.default_group.id], user_id=q.user_id),
        )

    def test_order_by_relationship(self):
        u1 = self.factory.create_user(name="alice")
        u2 = self.factory.create_user(name="bob")
        self.factory.create_query(user=u1)
        self.factory.create_query(user=u2)
        db.session.commit()
        # have to reset the order here with None since all_queries orders by
        # created_at by default
        base = models.Query.all_queries([self.factory.default_group.id]).order_by(None)
        qs1 = base.order_by(models.User.name)
        self.assertEqual(["alice", "bob"], [q.user.name for q in qs1])
        qs2 = base.order_by(models.User.name.desc())
        self.assertEqual(["bob", "alice"], [q.user.name for q in qs2])

    def test_update_query_hash_basesql_with_options(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, type="pg")
        query = self.factory.create_query(query_text="SELECT 2", data_source=ds)
        query.options = {"apply_auto_limit": True}
        origin_hash = query.query_hash
        query.update_query_hash()
        self.assertNotEqual(origin_hash, query.query_hash)

    def test_update_query_hash_basesql_no_options(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, type="pg")
        query = self.factory.create_query(query_text="SELECT 2", data_source=ds)
        query.options = {}
        origin_hash = query.query_hash
        query.update_query_hash()
        self.assertEqual(origin_hash, query.query_hash)

    def test_update_query_hash_non_basesql(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, type="prometheus")
        query = self.factory.create_query(query_text="SELECT 2", data_source=ds)
        query.options = {"apply_auto_limit": True}
        origin_hash = query.query_hash
        query.update_query_hash()
        self.assertEqual(origin_hash, query.query_hash)

    def test_update_query_hash_basesql_with_parameters(self):
        ds = self.factory.create_data_source(group=self.factory.org.default_group, type="pg")
        query = self.factory.create_query(query_text="SELECT {{num}}", data_source=ds)
        query.options = {"parameters": [{"type": "number", "name": "num", "value": 5}]}
        origin_hash = query.query_hash
        query.update_query_hash()
        self.assertNotEqual(origin_hash, query.query_hash)


class TestGroup(BaseTestCase):
    def test_returns_groups_with_specified_names(self):
        org1 = self.factory.create_org()
        org2 = self.factory.create_org()

        matching_group1 = models.Group(id=999, name="g1", org=org1)
        matching_group2 = models.Group(id=888, name="g2", org=org1)
        non_matching_group = models.Group(id=777, name="g1", org=org2)

        groups = models.Group.find_by_name(org1, ["g1", "g2"])
        self.assertIn(matching_group1, groups)
        self.assertIn(matching_group2, groups)
        self.assertNotIn(non_matching_group, groups)

    def test_returns_no_groups(self):
        org1 = self.factory.create_org()

        models.Group(id=999, name="g1", org=org1)
        self.assertEqual([], models.Group.find_by_name(org1, ["non-existing"]))


class TestQueryResultStoreResult(BaseTestCase):
    def setUp(self):
        super(TestQueryResultStoreResult, self).setUp()
        self.data_source = self.factory.data_source
        self.query = "SELECT 1"
        self.query_hash = gen_query_hash(self.query)
        self.runtime = 123
        self.utcnow = utcnow()
        self.data = {"a": 1}

    def test_stores_the_result(self):
        query_result = models.QueryResult.store_result(
            self.data_source.org_id,
            self.data_source,
            self.query_hash,
            self.query,
            self.data,
            self.runtime,
            self.utcnow,
        )

        self.assertEqual(query_result.data, self.data)
        self.assertEqual(query_result.runtime, self.runtime)
        self.assertEqual(query_result.retrieved_at, self.utcnow)
        self.assertEqual(query_result.query_text, self.query)
        self.assertEqual(query_result.query_hash, self.query_hash)
        self.assertEqual(query_result.data_source, self.data_source)


class TestEvents(BaseTestCase):
    def raw_event(self):
        timestamp = 1411778709.791
        user = self.factory.user
        created_at = datetime.datetime.utcfromtimestamp(timestamp)
        db.session.flush()
        raw_event = {
            "action": "view",
            "timestamp": timestamp,
            "object_type": "dashboard",
            "user_id": user.id,
            "object_id": 1,
            "org_id": 1,
        }

        return raw_event, user, created_at

    def test_records_event(self):
        raw_event, user, created_at = self.raw_event()

        event = models.Event.record(raw_event)
        db.session.flush()
        self.assertEqual(event.user, user)
        self.assertEqual(event.action, "view")
        self.assertEqual(event.object_type, "dashboard")
        self.assertEqual(event.object_id, 1)
        self.assertEqual(event.created_at, created_at)

    def test_records_additional_properties(self):
        raw_event, _, _ = self.raw_event()
        additional_properties = {"test": 1, "test2": 2, "whatever": "abc"}
        raw_event.update(additional_properties)

        event = models.Event.record(raw_event)

        self.assertDictEqual(event.additional_properties, additional_properties)


def _set_up_dashboard_test(d):
    d.g1 = d.factory.create_group(name="First", permissions=["create", "view"])
    d.g2 = d.factory.create_group(name="Second", permissions=["create", "view"])
    d.ds1 = d.factory.create_data_source()
    d.ds2 = d.factory.create_data_source()
    db.session.flush()
    d.u1 = d.factory.create_user(group_ids=[d.g1.id])
    d.u2 = d.factory.create_user(group_ids=[d.g2.id])
    db.session.add_all(
        [
            models.DataSourceGroup(group=d.g1, data_source=d.ds1),
            models.DataSourceGroup(group=d.g2, data_source=d.ds2),
        ]
    )
    d.q1 = d.factory.create_query(data_source=d.ds1)
    d.q2 = d.factory.create_query(data_source=d.ds2)
    d.v1 = d.factory.create_visualization(query_rel=d.q1)
    d.v2 = d.factory.create_visualization(query_rel=d.q2)
    d.w1 = d.factory.create_widget(visualization=d.v1)
    d.w2 = d.factory.create_widget(visualization=d.v2)
    d.w3 = d.factory.create_widget(visualization=d.v2, dashboard=d.w2.dashboard)
    d.w4 = d.factory.create_widget(visualization=d.v2)
    d.w5 = d.factory.create_widget(visualization=d.v1, dashboard=d.w4.dashboard)
    d.w1.dashboard.is_draft = False
    d.w2.dashboard.is_draft = False
    d.w4.dashboard.is_draft = False


class TestDashboardAll(BaseTestCase):
    def setUp(self):
        super(TestDashboardAll, self).setUp()
        _set_up_dashboard_test(self)

    def test_requires_group_or_user_id(self):
        d1 = self.factory.create_dashboard()
        self.assertNotIn(d1, list(models.Dashboard.all(d1.user.org, d1.user.group_ids, None)))
        l2 = list(models.Dashboard.all(d1.user.org, [0], d1.user.id))
        self.assertIn(d1, l2)

    def test_returns_dashboards_based_on_groups(self):
        self.assertIn(
            self.w1.dashboard,
            list(models.Dashboard.all(self.u1.org, self.u1.group_ids, None)),
        )
        self.assertIn(
            self.w2.dashboard,
            list(models.Dashboard.all(self.u2.org, self.u2.group_ids, None)),
        )
        self.assertNotIn(
            self.w1.dashboard,
            list(models.Dashboard.all(self.u2.org, self.u2.group_ids, None)),
        )
        self.assertNotIn(
            self.w2.dashboard,
            list(models.Dashboard.all(self.u1.org, self.u1.group_ids, None)),
        )

    def test_returns_each_dashboard_once(self):
        dashboards = list(models.Dashboard.all(self.u2.org, self.u2.group_ids, None))
        self.assertEqual(len(dashboards), 2)

    def test_returns_dashboard_you_have_partial_access_to(self):
        self.assertIn(
            self.w5.dashboard,
            models.Dashboard.all(self.u1.org, self.u1.group_ids, None),
        )

    def test_returns_dashboards_created_by_user(self):
        d1 = self.factory.create_dashboard(user=self.u1)
        db.session.flush()
        self.assertIn(d1, list(models.Dashboard.all(self.u1.org, self.u1.group_ids, self.u1.id)))
        self.assertIn(d1, list(models.Dashboard.all(self.u1.org, [0], self.u1.id)))
        self.assertNotIn(d1, list(models.Dashboard.all(self.u2.org, self.u2.group_ids, self.u2.id)))

    def test_returns_dashboards_with_text_widgets_to_creator(self):
        w1 = self.factory.create_widget(visualization=None)

        self.assertEqual(w1.dashboard.user, self.factory.user)
        self.assertIn(
            w1.dashboard,
            list(
                models.Dashboard.all(
                    self.factory.user.org,
                    self.factory.user.group_ids,
                    self.factory.user.id,
                )
            ),
        )
        self.assertNotIn(
            w1.dashboard,
            list(models.Dashboard.all(self.u1.org, self.u1.group_ids, self.u1.id)),
        )

    def test_returns_dashboards_from_current_org_only(self):
        w1 = self.factory.create_widget()

        user = self.factory.create_user(org=self.factory.create_org())

        self.assertIn(
            w1.dashboard,
            list(models.Dashboard.all(self.factory.user.org, self.factory.user.group_ids, None)),
        )
        self.assertNotIn(w1.dashboard, list(models.Dashboard.all(user.org, user.group_ids, user.id)))
