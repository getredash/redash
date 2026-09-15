import logging

import jwt
from flask import Blueprint, redirect, request, url_for
from flask_login import login_user

from redash import models
from redash.authentication import get_login_url, get_next_path, jwt_auth
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


def read_the_token(org, token):
    try:
        claims, token_is_valid = jwt_auth.verify_jwt_token(
            token,
            expected_issuer=metr_settings.SSO_ISSUER,
            expected_audience=metr_settings.SSO_AUDIENCE,
            algorithms=metr_settings.SSO_ALGORITHMS,
            public_certs_url=metr_settings.SSO_CALLBACK_JWKS_URL,
        )
    except OSError as error:
        logger.warning("Could not read the signing keys for %r: %s", org.slug, error)
        return None
    except jwt.PyJWTError as error:
        logger.info("Could not read the hand-off token: %s", error)
        return None

    if not token_is_valid or not claims:
        logger.info("Refusing a hand-off token that does not verify")
        return None

    if "email" not in claims:
        logger.info("Refusing a hand-off token that names no email")
        return None

    return models.User.get_by_email_and_org(claims["email"], org)


def clear_the_token(response):
    response.delete_cookie(
        metr_settings.SSO_COOKIE_NAME,
        domain=metr_settings.SSO_COOKIE_DOMAIN or None,
    )
    return response


@blueprint.route(org_scoped_rule("/metr/callback"))
def callback(org_slug=None):
    org = current_org._get_current_object()
    next_path = get_next_path(request.args.get("next"))
    token = request.cookies.get(metr_settings.SSO_COOKIE_NAME)

    user = read_the_token(org, token)
    if user is None:
        return clear_the_token(redirect(get_login_url(next=next_path or None)))

    login_user(user)

    destination = next_path or url_for("redash.index", org_slug=org_slug)
    return clear_the_token(redirect(destination))


def login_url_for_the_login_page():
    if not is_enabled():
        return None

    return url_for(
        "metr_sso.login",
        org_slug=current_org.slug,
        next=get_next_path(request.args.get("next")) or None,
    )


def init_app(app):
    app.register_blueprint(blueprint)
    app.jinja_env.globals["metr_sso_login_url"] = login_url_for_the_login_page
