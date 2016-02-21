from flask import request

from redash import statsd_client
from redash.wsgi import api
from redash.handlers.base import BaseResource


class EventAPI(BaseResource):
    def post(self):
        events_list = request.get_json(force=True)
        for event in events_list:
            self.record_event(event)


api.add_org_resource(EventAPI, '/api/events', endpoint='events')
