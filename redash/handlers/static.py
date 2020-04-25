import logging

from flask import current_app
from flask import render_template
from flask import safe_join
from flask import send_file
from flask_login import login_required
from jinja2.exceptions import TemplateNotFound

from redash import settings
from redash.handlers import routes
from redash.handlers.authentication import base_href
from redash.handlers.base import org_scoped_rule
from redash.security import csp_allows_embeding

logger = logging.getLogger(__name__)


def render_index():
    try:
        if settings.MULTI_ORG:
            response = render_template("multi_org.html", base_href=base_href())
        else:
            full_path = safe_join(settings.STATIC_ASSETS_PATH, "index.html")
            response = send_file(full_path,
                                 **dict(cache_timeout=0, conditional=True))
    except TemplateNotFound as e:
        logger.exception("%s is not found", e.name)
        if current_app.debug:
            message = "Missing template file ({}). Did you build the frontend assets with npm?".format(
                e.name)
            status = 404
        else:
            message = "Error Rendering Page."
            status = 500
        response = render_template("error.html", error_message=message), status

    return response


@routes.route(org_scoped_rule("/dashboard/<slug>"), methods=["GET"])
@login_required
@csp_allows_embeding
def dashboard(slug, org_slug=None):
    return render_index()


@routes.route(org_scoped_rule("/<path:path>"))
@routes.route(org_scoped_rule("/"))
@login_required
def index(**kwargs):
    return render_index()
