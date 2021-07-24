import datetime
from mock import patch
from tests import BaseTestCase
from redash.tasks import empty_schedules
from redash.models import Query
from redash.utils import utcnow


class TestEmptyScheduleQuery(BaseTestCase):
    def test_empty_schedules(self):
        one_day_ago = (utcnow() - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        query = self.factory.create_query(
            schedule={"interval": "3600", "until": one_day_ago}
        )
        oq = staticmethod(lambda: [query])
        with patch.object(Query, "past_scheduled_queries", oq):
            empty_schedules()
            self.assertEqual(query.schedule, None)
