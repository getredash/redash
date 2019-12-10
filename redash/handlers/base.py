import time

from inspect import isclass
from flask import Blueprint, current_app, request

from flask_login import current_user, login_required
from flask_restful import Resource, abort
from redash import settings
from redash.authentication import current_org
from redash.models import db
from redash.tasks import record_event as record_event_task
from redash.utils import json_dumps
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy import cast
from sqlalchemy.dialects import postgresql
from sqlalchemy_utils import sort_query

routes = Blueprint(
    "redash", __name__, template_folder=settings.fix_assets_path("templates")
)


class BaseResource(Resource):
    decorators = [login_required]

    def __init__(self, *args, **kwargs):
        super(BaseResource, self).__init__(*args, **kwargs)
        self._user = None

    def dispatch_request(self, *args, **kwargs):
        kwargs.pop("org_slug", None)

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
    if user.is_api_user():
        options.update({"api_key": user.name, "org_id": org.id})
    else:
        options.update({"user_id": user.id, "user_name": user.name, "org_id": org.id})

    options.update({"user_agent": request.user_agent.string, "ip": request.remote_addr})

    if "timestamp" not in options:
        options["timestamp"] = int(time.time())

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


def paginate(query_set, page, page_size, serializer, **kwargs):
    count = query_set.count()

    if page < 1:
        abort(400, message="Page must be positive integer.")

    if (page - 1) * page_size + 1 > count > 0:
        abort(400, message="Page is out of range.")

    if page_size > 250 or page_size < 1:
        abort(400, message="Page size is out of range (1-250).")

    results = query_set.paginate(page, page_size)

    # support for old function based serializers
    if isclass(serializer):
        items = serializer(results.items, **kwargs).serialize()
    else:
        items = [serializer(result) for result in results.items]

    return {"count": count, "page": page, "page_size": page_size, "results": items}


def org_scoped_rule(rule):
    if settings.MULTI_ORG:
        return "/<org_slug>{}".format(rule)

    return rule


def json_response(response):
    return current_app.response_class(json_dumps(response), mimetype="application/json")


def filter_by_tags(result_set, column):
    if request.args.getlist("tags"):
        tags = request.args.getlist("tags")
        result_set = result_set.filter(
            cast(column, postgresql.ARRAY(db.Text)).contains(tags)
        )
    return result_set


def order_results(results, default_order, allowed_orders, fallback=True):
    """
    Orders the given results with the sort order as requested in the
    "order" request query parameter or the given default order.
    """
    # See if a particular order has been requested
    requested_order = request.args.get("order", "").strip()

    # and if not (and no fallback is wanted) return results as is
    if not requested_order and not fallback:
        return results

    # and if it matches a long-form for related fields, falling
    # back to the default order
    selected_order = allowed_orders.get(requested_order, None)
    if selected_order is None and fallback:
        selected_order = default_order
    # The query may already have an ORDER BY statement attached
    # so we clear it here and apply the selected order
    return sort_query(results.order_by(None), selected_order)
