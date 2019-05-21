from unittest import TestCase

import mock

from tests import BaseTestCase
from redash import redis_connection, models, settings
from redash.tasks.failure_report import notify_of_failure
from redash.utils import json_loads

class TestSendAggregatedErrorsTask(BaseTestCase):
    def notify(self, message="Oh no, I failed!", **kwargs):
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

    def test_aggregates_multiple_queries_in_a_single_report(self):
        key1 = self.notify(message="I'm a failure")
        key2 = self.notify(message="I'm simply not a success")

        self.assertEqual(key1, key2)
