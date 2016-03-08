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


class MetricsAPI(BaseResource):
    def post(self):
        for stat_line in request.data.split():
            stat, value = stat_line.split(':')
            statsd_client._send_stat('client.{}'.format(stat), value, 1)

        return "OK."

api.add_resource(MetricsAPI, '/api/metrics/v1/send', endpoint='metrics')
