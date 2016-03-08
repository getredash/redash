from flask_restful import Resource, abort
from flask_login import current_user, login_required
from peewee import DoesNotExist

from redash.authentication.org_resolving import current_org
from redash.tasks import record_event


class BaseResource(Resource):
    decorators = [login_required]

    def __init__(self, *args, **kwargs):
        super(BaseResource, self).__init__(*args, **kwargs)
        self._user = None

    def dispatch_request(self, *args, **kwargs):
        kwargs.pop('org_slug', None)

        return super(BaseResource, self).dispatch_request(*args, **kwargs)

    @property
    def current_user(self):
        return current_user._get_current_object()

    @property
    def current_org(self):
        return current_org._get_current_object()

    def record_event(self, options):
        options.update({
            'user_id': self.current_user.id,
            'org_id': self.current_org.id
        })

        record_event.delay(options)


def require_fields(req, fields):
    for f in fields:
        if f not in req:
            abort(400)


def get_object_or_404(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except DoesNotExist:
        abort(404)
