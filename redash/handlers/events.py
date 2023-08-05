import geolite2
import maxminddb
from flask import request
from user_agents import parse as parse_ua

from redash.handlers.base import BaseResource, paginate
from redash.permissions import require_admin


def get_location(ip):
    if ip is None:
        return "Unknown"

    with maxminddb.open_database(geolite2.geolite2_database()) as reader:
        try:
            match = reader.get(ip)
            return match["country"]["names"]["en"]
        except Exception:
            return "Unknown"


def event_details(event):
    details = {}
    if event.object_type == "data_source" and event.action == "execute_query":
        details["query"] = event.additional_properties["query"]
        details["data_source"] = event.object_id
    elif event.object_type == "page" and event.action == "view":
        details["page"] = event.object_id
    else:
        details["object_id"] = event.object_id
        details["object_type"] = event.object_type

    return details


def serialize_event(event):
    d = {
        "org_id": event.org_id,
        "user_id": event.user_id,
        "action": event.action,
        "object_type": event.object_type,
        "object_id": event.object_id,
        "created_at": event.created_at,
    }

    if event.user_id:
        d["user_name"] = event.additional_properties.get("user_name", "User {}".format(event.user_id))

    if not event.user_id:
        d["user_name"] = event.additional_properties.get("api_key", "Unknown")

    d["browser"] = str(parse_ua(event.additional_properties.get("user_agent", "")))
    d["location"] = get_location(event.additional_properties.get("ip"))
    d["details"] = event_details(event)

    return d


class EventsResource(BaseResource):
    def post(self):
        events_list = request.get_json(force=True)
        for event in events_list:
            self.record_event(event)

    @require_admin
    def get(self):
        page = request.args.get("page", 1, type=int)
        page_size = request.args.get("page_size", 25, type=int)
        return paginate(self.current_org.events, page, page_size, serialize_event)
