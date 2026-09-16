import logging

import jwt
from flask import Blueprint, flash, redirect, request, session, url_for
from flask_babel import gettext as _
from flask_login import login_user, logout_user

from redash import models
from redash.authentication import get_login_url, get_next_path, jwt_auth
from redash.authentication.org_resolving import current_org
from redash.handlers.base import org_scoped_rule
from redash.settings import metr as metr_settings
from redash.utils import sentry

logger = logging.getLogger(__name__)

STANDARD_GROUP_TYPE = "standard"

blueprint = Blueprint("metr_sso", __name__)


class MisconfiguredError(Exception):
    pass


class CannotProvision(Exception):
    """
    Raised when a token names somebody we are willing to admit but cannot make an account for.

    Subclasses are caught together in the callback, which reports the instance to Sentry and
    sends the visitor to the login page with a message that says nothing about our
    configuration. Every subclass message must therefore name the organization and say what
    would fix it, because the report is all anybody gets. Each subclass groups as its own
    Sentry issue, so raise a new one rather than reusing another's message.
    """


class NoStandardGroup(CannotProvision):
    pass


class NoNameInTheToken(CannotProvision):
    pass


def is_enabled():
    return bool(metr_settings.SSO_LOGIN_URL)


def login_url_for(org):
    return metr_settings.SSO_LOGIN_URL.replace("{org_slug}", org.slug)


def jwks_url_for(org):
    return metr_settings.SSO_CALLBACK_JWKS_URL.replace("{org_slug}", org.slug)


@blueprint.route(org_scoped_rule("/metr/login"))
def login(org_slug=None):
    next_path = get_next_path(request.args.get("next")) or url_for("redash.index", org_slug=org_slug)
    if not is_enabled():
        logger.error("Cannot start a login without REDASH_METR_SSO_LOGIN_URL being set")
        return redirect(next_path)

    return redirect("{}?next={}".format(login_url_for(current_org), next_path))


def standard_group_for(org):
    group = models.Group.query.filter(
        models.Group.org == org,
        models.Group.type == STANDARD_GROUP_TYPE,
    ).first()

    if group is None:
        raise NoStandardGroup(
            "No group of type {!r} in organization {!r}, so a new single sign-on user cannot be "
            "provisioned there. Create one with `./manage.py metr create_standard_group {}`; new "
            "organizations get one from toolbox.".format(STANDARD_GROUP_TYPE, org.slug, org.slug)
        )

    return group


def full_name_from(claims):
    first_name = (claims.get("first_name") or "").strip()
    last_name = (claims.get("last_name") or "").strip()

    if not first_name or not last_name:
        raise NoNameInTheToken(
            f"The hand-off token for {claims['email']!r} carries no first_name and last_name, so "
            "a new single sign-on user cannot be provisioned. Set the person's first and last "
            "name in core-backend."
        )

    return f"{first_name} {last_name}"


def provision(org, email, name):
    user = models.User(
        org=org,
        name=name,
        email=email,
        is_invitation_pending=False,
        group_ids=[standard_group_for(org).id],
    )
    models.db.session.add(user)
    models.db.session.commit()
    logger.info("Provisioned %r into the standard group of %r", email, org.slug)
    return user


def read_the_token(org, token):
    try:
        claims, token_is_valid = jwt_auth.verify_jwt_token(
            token,
            expected_issuer=metr_settings.SSO_ISSUER,
            expected_audience=metr_settings.SSO_AUDIENCE,
            algorithms=metr_settings.SSO_ALGORITHMS,
            public_certs_url=jwks_url_for(org),
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

    named_tenant = claims.get(metr_settings.SSO_TENANT_CLAIM)
    if named_tenant != org.slug:
        logger.info(
            "Hand-off token was issued for %r, not for organization %r, refusing it",
            named_tenant,
            org.slug,
        )
        return None

    try:
        user = models.User.get_by_email_and_org(claims["email"], org)
    except models.NoResultFound:
        return provision(org, claims["email"], full_name_from(claims))

    if user.is_disabled:
        logger.info("Refusing a hand-off token for %r, who is disabled here", user.email)
        return None

    return user


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
    if not token:
        logger.info("No hand-off token on the request, sending %r to the login page", org.slug)
        return clear_the_token(redirect(get_login_url(next=next_path or None)))

    try:
        user = read_the_token(org, token)
    except CannotProvision as error:
        sentry.capture_exception(error)
        logger.error("Cannot provision into %r: %s", org.slug, error)
        flash(_("Your account could not be set up. Please contact support."))
        user = None

    if user is None:
        return clear_the_token(redirect(get_login_url(next=next_path or None)))

    signed_in_before = session.get("_user_id")
    if signed_in_before != user.get_id():
        if signed_in_before is not None:
            logout_user()
        login_user(user)
        logger.info(
            "Spent a hand-off token for %r in %r, replacing session %r",
            user.email,
            org.slug,
            signed_in_before,
        )
    else:
        logger.info("Hand-off token for %r in %r names the session already here", user.email, org.slug)

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
    if is_enabled() and not metr_settings.SSO_TENANT_CLAIM:
        raise MisconfiguredError(
            "REDASH_METR_SSO_LOGIN_URL is set but REDASH_METR_SSO_TENANT_CLAIM is not. A token "
            "issued for one organization would be accepted at every other one. Set "
            "REDASH_METR_SSO_TENANT_CLAIM to the claim naming the tenant, e.g. 'tenant'."
        )

    app.register_blueprint(blueprint)
    app.jinja_env.globals["metr_sso_login_url"] = login_url_for_the_login_page
