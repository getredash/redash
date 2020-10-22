from flask import request

from redash.handlers.base import BaseResource, paginate
from redash.permissions import require_admin
from redash.serializers import EventSerializer


class EventsResource(BaseResource):
    def post(self):
        events_list = request.get_json(force=True)
        for event in events_list:
            self.record_event(event)

    @require_admin
    def get(self):
        page = request.args.get("page", 1, type=int)
        page_size = request.args.get("page_size", 25, type=int)
        return paginate(self.current_org.events, page, page_size, EventSerializer)
