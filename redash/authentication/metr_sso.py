import logging

from flask import Blueprint, redirect, request, url_for

from redash.authentication import get_next_path
from redash.authentication.org_resolving import current_org
from redash.handlers.base import org_scoped_rule
from redash.settings import metr as metr_settings

logger = logging.getLogger(__name__)

blueprint = Blueprint("metr_sso", __name__)


def is_enabled():
    return bool(metr_settings.SSO_LOGIN_URL)


def login_url_for(org):
    return metr_settings.SSO_LOGIN_URL.replace("{org_slug}", org.slug)


@blueprint.route(org_scoped_rule("/metr/login"))
def login(org_slug=None):
    next_path = get_next_path(request.args.get("next")) or url_for("redash.index", org_slug=org_slug)
    if not is_enabled():
        logger.error("Cannot start a login without REDASH_METR_SSO_LOGIN_URL being set")
        return redirect(next_path)

    return redirect("{}?next={}".format(login_url_for(current_org), next_path))


def init_app(app):
    app.register_blueprint(blueprint)
