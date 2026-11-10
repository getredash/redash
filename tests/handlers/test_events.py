import time

from redash import models
from tests import BaseTestCase


class TestEventsResourceGet(BaseTestCase):
    def record_event(self, **properties):
        event = {
            "org_id": self.factory.org.id,
            "user_id": self.factory.user.id,
            "timestamp": int(time.time()),
        }
        event.update(properties)
        models.Event.record(event)
        models.db.session.commit()

    def test_lists_execute_query_events(self):
        self.record_event(action="execute_query", object_type="data_source", object_id="1", query="SELECT 1")

        rv = self.make_request("get", "/api/events", user=self.factory.create_admin())

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["results"][0]["details"], {"query": "SELECT 1", "data_source": "1"})

    def test_lists_execute_query_events_without_query(self):
        self.record_event(action="execute_query", object_type="data_source", object_id="1")

        rv = self.make_request("get", "/api/events", user=self.factory.create_admin())

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["results"][0]["details"], {"query": None, "data_source": "1"})
