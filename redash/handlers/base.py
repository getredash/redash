from flask.ext.restful import Resource, abort
from flask_login import current_user, login_required


class BaseResource(Resource):
    decorators = [login_required]

    def __init__(self, *args, **kwargs):
        super(BaseResource, self).__init__(*args, **kwargs)
        self._user = None

    @property
    def current_user(self):
        return current_user._get_current_object()


def require_fields(req, fields):
    for f in fields:
        if f not in req:
            abort(400)
