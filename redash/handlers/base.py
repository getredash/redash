from flask.ext.restful import Resource, abort
from flask_login import current_user, login_required
from peewee import DoesNotExist

from redash.authentication.org_resolving import current_org


class BaseResource(Resource):
    decorators = [login_required]

    def __init__(self, *args, **kwargs):
        super(BaseResource, self).__init__(*args, **kwargs)
        self._user = None

    @property
    def current_user(self):
        return current_user._get_current_object()

    @property
    def current_org(self):
        return current_org._get_current_object()


def require_fields(req, fields):
    for f in fields:
        if f not in req:
            abort(400)


def get_object_or_404(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except DoesNotExist:
        abort(404)
