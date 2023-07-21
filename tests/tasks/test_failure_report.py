import dateutil
import mock
from freezegun import freeze_time

from redash import redis_connection, settings
from redash.tasks.failure_report import (
    key,
    notify_of_failure,
    send_failure_report,
)
from tests import BaseTestCase


class TestSendAggregatedErrorsTask(BaseTestCase):
    def setUp(self):
        super(TestSendAggregatedErrorsTask, self).setUp()
        redis_connection.flushall()
        self.factory.org.set_setting("send_email_on_failed_scheduled_queries", True)

    def notify(self, message="Oh no, I failed!", query=None, **kwargs):
        if query is None:
            query = self.factory.create_query(**kwargs)

        notify_of_failure(message, query)
        return key(query.user.id)

    @mock.patch("redash.tasks.failure_report.render_template", return_value="")
    def send_email(self, user, render_template):
        send_failure_report(user.id)

        _, context = render_template.call_args[0]
        return context["failures"]

    def test_schedules_email_if_failure_count_is_beneath_limit(self):
        key = self.notify(schedule_failures=settings.MAX_FAILURE_REPORTS_PER_QUERY - 1)
        email_pending = redis_connection.exists(key)
        self.assertTrue(email_pending)

    def test_does_not_report_if_failure_count_is_beyond_limit(self):
        key = self.notify(schedule_failures=settings.MAX_FAILURE_REPORTS_PER_QUERY)
        email_pending = redis_connection.exists(key)
        self.assertFalse(email_pending)

    def test_does_not_report_if_organization_is_not_subscribed(self):
        self.factory.org.set_setting("send_email_on_failed_scheduled_queries", False)
        key = self.notify()
        email_pending = redis_connection.exists(key)
        self.assertFalse(email_pending)

    def test_does_not_report_if_query_owner_is_disabled(self):
        self.factory.user.disable()
        key = self.notify()
        email_pending = redis_connection.exists(key)
        self.assertFalse(email_pending)

    def test_does_not_indicate_when_not_near_limit_for_a_query(self):
        self.notify(schedule_failures=settings.MAX_FAILURE_REPORTS_PER_QUERY / 2)
        failures = self.send_email(self.factory.user)

        self.assertFalse(failures[0]["comment"])

    def test_indicates_when_near_limit_for_a_query(self):
        self.notify(schedule_failures=settings.MAX_FAILURE_REPORTS_PER_QUERY - 1)
        failures = self.send_email(self.factory.user)

        self.assertTrue(failures[0]["comment"])

    def test_aggregates_different_queries_in_a_single_report(self):
        key1 = self.notify(message="I'm a failure")
        key2 = self.notify(message="I'm simply not a success")

        self.assertEqual(key1, key2)

    def test_counts_failures_for_each_reason(self):
        query = self.factory.create_query()

        self.notify(message="I'm a failure", query=query)
        self.notify(message="I'm a failure", query=query)
        self.notify(message="I'm a different type of failure", query=query)
        self.notify(message="I'm a totally different query")

        failures = self.send_email(query.user)

        f1 = next(f for f in failures if f["failure_reason"] == "I'm a failure")
        self.assertEqual(2, f1["failure_count"])
        f2 = next(f for f in failures if f["failure_reason"] == "I'm a different type of failure")
        self.assertEqual(1, f2["failure_count"])
        f3 = next(f for f in failures if f["failure_reason"] == "I'm a totally different query")
        self.assertEqual(1, f3["failure_count"])

    def test_shows_latest_failure_time(self):
        query = self.factory.create_query()

        with freeze_time("2000-01-01"):
            self.notify(query=query)

        self.notify(query=query)

        failures = self.send_email(query.user)
        latest_failure = dateutil.parser.parse(failures[0]["failed_at"])
        self.assertNotEqual(2000, latest_failure.year)
