from flask import request
from flask.ext.restful import Resource, abort
from flask_login import current_user, login_required

from redash import statsd_client


class BaseResource(Resource):
    decorators = [login_required]

    def __init__(self, *args, **kwargs):
        super(BaseResource, self).__init__(*args, **kwargs)
        self._user = None

    @property
    def current_user(self):
        return current_user._get_current_object()

    def dispatch_request(self, *args, **kwargs):
        with statsd_client.timer('requests.{}.{}'.format(request.endpoint, request.method.lower())):
            response = super(BaseResource, self).dispatch_request(*args, **kwargs)
        return response


def require_fields(req, fields):
    for f in fields:
        if f not in req:
            abort(400)

