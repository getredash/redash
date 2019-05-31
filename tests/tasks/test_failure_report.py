from unittest import TestCase

import mock
from freezegun import freeze_time
import dateutil

from tests import BaseTestCase
from redash import redis_connection, models, settings
from redash.tasks.failure_report import notify_of_failure, send_aggregated_errors
from redash.utils import json_loads

class TestSendAggregatedErrorsTask(BaseTestCase):
    def setUp(self):
        super(TestSendAggregatedErrorsTask, self).setUp()
        redis_connection.flushall()
        settings.organization.SEND_EMAIL_ON_FAILED_SCHEDULED_QUERIES = True

    def tearDown(self):
        super(TestSendAggregatedErrorsTask, self).tearDown()
        settings.organization.SEND_EMAIL_ON_FAILED_SCHEDULED_QUERIES = False

    def notify(self, message="Oh no, I failed!", query=None, **kwargs):
        if query is None:
            query = self.factory.create_query(**kwargs)

        notify_of_failure(message, query)
        return "aggregated_failures:{}".format(query.user.email)

    def test_schedules_email_if_failure_count_is_beneath_limit(self):
        key = self.notify(schedule_failures=settings.MAX_FAILURE_REPORTS_PER_QUERY - 1)
        email_pending = redis_connection.get("{}:pending".format(key))
        self.assertTrue(email_pending)

    def test_does_not_report_if_failure_count_is_beyond_limit(self):
        key = self.notify(schedule_failures=settings.MAX_FAILURE_REPORTS_PER_QUERY)
        email_pending = redis_connection.get("{}:pending".format(key))
        self.assertFalse(email_pending)

    def test_does_not_indicate_when_not_near_limit_for_a_query(self):
        key = self.notify(schedule_failures=settings.MAX_FAILURE_REPORTS_PER_QUERY / 2)
        failure = json_loads(redis_connection.lrange(key, 0, -1)[0])
        comment = failure.get('comment')
        self.assertFalse(comment)

    def test_indicates_when_near_limit_for_a_query(self):
        key = self.notify(schedule_failures=settings.MAX_FAILURE_REPORTS_PER_QUERY - 1)
        failure = json_loads(redis_connection.lrange(key, 0, -1)[0])
        comment = failure.get('comment')
        self.assertTrue(comment)

    def test_aggregates_different_queries_in_a_single_report(self):
        key1 = self.notify(message="I'm a failure")
        key2 = self.notify(message="I'm simply not a success")

        self.assertEqual(key1, key2)

    @mock.patch('redash.tasks.failure_report.render_template')
    def test_counts_failures_for_each_reason(self, render_template):
        query = self.factory.create_query()

        self.notify(message="I'm a failure", query=query)
        self.notify(message="I'm a failure", query=query)
        self.notify(message="I'm a different type of failure", query=query)
        self.notify(message="I'm a totally different query")

        send_aggregated_errors(query.user.email)

        _, context = render_template.call_args
        failures = context['failures']

        f1 = next(f for f in failures if f["failure_reason"] == "I'm a failure")
        self.assertEqual(2, f1['failure_count'])
        f2 = next(f for f in failures if f["failure_reason"] == "I'm a different type of failure")
        self.assertEqual(1, f2['failure_count'])
        f3 = next(f for f in failures if f["failure_reason"] == "I'm a totally different query")
        self.assertEqual(1, f3['failure_count'])

    @mock.patch('redash.tasks.failure_report.render_template')
    def test_shows_latest_failure_time(self, render_template):
        query = self.factory.create_query()

        with freeze_time("2000-01-01"):
            self.notify(query=query)

        self.notify(query=query)

        send_aggregated_errors(query.user.email)

        _, context = render_template.call_args
        latest_failure = dateutil.parser.parse(context['failures'][0]['failed_at'])
        self.assertNotEqual(2000, latest_failure.year)
