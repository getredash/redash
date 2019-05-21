from unittest import TestCase

import mock

from tests import BaseTestCase
from redash import redis_connection, models, settings
from redash.tasks.failure_report import notify_of_failure

class TestSendAggregatedErrorsTask(BaseTestCase):
    def test_schedules_email_if_failure_count_is_beneath_limit(self):
        query = self.factory.create_query(schedule_failures=settings.MAX_FAILURE_REPORTS_PER_QUERY - 1)

        notify_of_failure("Oh no, I failed!", query)

        email_pending = redis_connection.get("aggregated_failures:{}:pending".format(query.user.email))
        self.assertTrue(email_pending)

    def test_does_not_report_if_failure_count_is_beyond_limit(self):
        query = self.factory.create_query(schedule_failures=settings.MAX_FAILURE_REPORTS_PER_QUERY)

        notify_of_failure("Oh no, I failed!", query)

        email_pending = redis_connection.get("aggregated_failures:{}:pending".format(query.user.email))
        self.assertFalse(email_pending)
