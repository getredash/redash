import time

from flask import Blueprint, current_app, request
from flask_login import current_user, login_required
from flask_restful import Resource, abort

from sqlalchemy.orm.exc import NoResultFound

from redash import settings
from redash.authentication import current_org
from redash.models import ApiUser
from redash.tasks import record_event as record_event_task
from redash.utils import json_dumps

routes = Blueprint('redash', __name__, template_folder=settings.fix_assets_path('templates'))


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
        record_event(self.current_org, self.current_user, options)

    # TODO: this should probably be somewhere else
    def update_model(self, model, updates):
        for k, v in updates.items():
            setattr(model, k, v)


def record_event(org, user, options):
    if isinstance(user, ApiUser):
        options.update({
            'api_key': user.name,
            'org_id': org.id
        })
    else:
        options.update({
            'user_id': user.id,
            'org_id': org.id
        })

    options.update({
        'user_agent': request.user_agent.string,
        'ip': request.remote_addr
    })

    if 'timestamp' not in options:
        options['timestamp'] = int(time.time())

    record_event_task.delay(options)


def require_fields(req, fields):
    for f in fields:
        if f not in req:
            abort(400)


def get_object_or_404(fn, *args, **kwargs):
    try:
        rv = fn(*args, **kwargs)
        if rv is None:
            abort(404)
    except NoResultFound:
        abort(404)
    return rv


def paginate(query_set, page, page_size, serializer):
    count = query_set.count()

    if page < 1:
        abort(400, message='Page must be positive integer.')

    if (page-1)*page_size+1 > count > 0:
        abort(400, message='Page is out of range.')

    if page_size > 250 or page_size < 1:
        abort(400, message='Page size is out of range (1-250).')

    results = query_set.paginate(page, page_size)

    return {
        'count': count,
        'page': page,
        'page_size': page_size,
        'results': [serializer(result) for result in results.items],
    }


def org_scoped_rule(rule):
    if settings.MULTI_ORG:
        return "/<org_slug:org_slug>{}".format(rule)

    return rule


def json_response(response):
    return current_app.response_class(json_dumps(response), mimetype='application/json')
