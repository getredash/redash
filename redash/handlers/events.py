from flask import request

from redash.handlers.base import BaseResource
from redash.models import db


class EventResource(BaseResource):
    def post(self):
        events_list = request.get_json(force=True)
        for event in events_list:
            self.record_event(event)
        db.session.commit()

