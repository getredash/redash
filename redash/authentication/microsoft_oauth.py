import logging
import requests
import jwt
from flask import redirect, url_for, Blueprint, flash, request, session
from flask_oauthlib.client import OAuth

from redash import models, settings
from redash.authentication import (
    create_and_login_user,
    logout_and_redirect_to_index,
    get_next_path,
)
from redash.authentication.org_resolving import current_org

logger = logging.getLogger("microsoft_oauth")

oauth = OAuth()
blueprint = Blueprint("microsoft_oauth", __name__)

def microsoft_remote_app():
    if "microsoft" not in oauth.remote_apps:
        oauth.remote_app(
            "microsoft",
            base_url="https://login.microsoftonline.com",
            authorize_url="https://login.microsoftonline.com/{}/oauth2/v2.0/authorize".format(settings.MICROSOFT_TENANT_ID),
            request_token_url=None,
            request_token_params={
                "scope": "openid email",
            },
            access_token_url="https://login.microsoftonline.com/{}/oauth2/v2.0/token".format(settings.MICROSOFT_TENANT_ID),
            access_token_method="POST",
            consumer_key=settings.MICROSOFT_CLIENT_ID,
            consumer_secret=settings.MICROSOFT_CLIENT_SECRET,
        )

    return oauth.microsoft


def get_user_profile(code):
    resp = microsoft_remote_app().authorized_response()
    id_token = resp.get("id_token")
    if id_token is None:
        logger.warning("Failed getting user profile.", resp)
        return None
    profile = jwt.decode(id_token.encode('utf-8'), verify=False)
    profile['name'] = profile['email'].split('@', 1)[0]
    return profile


def verify_profile(org, profile):
    if org.is_public:
        return True

    email = profile["email"]
    domain = email.split("@")[-1]

    if domain in org.microsoft_apps_domains:
        return True

    if org.has_user(email) == 1:
        return True

    return False


@blueprint.route("/<org_slug>/oauth/microsoft", endpoint="authorize_org")
def org_login(org_slug):
    session["org_slug"] = current_org.slug
    return redirect(url_for(".authorize", next=request.args.get("next", None)))


@blueprint.route("/oauth/microsoft", endpoint="authorize")
def login():
    callback = url_for(".callback", _external=True)
    next_path = request.args.get(
        "next", url_for("redash.index", org_slug=session.get("org_slug"))
    )
    logger.debug("Callback url: %s", callback)
    logger.debug("Next is: %s", next_path)
    return microsoft_remote_app().authorize(callback=callback, state=next_path)


@blueprint.route("/oauth/microsoft_callback", endpoint="callback")
def authorized():
    code = request.args.get('code')
    if code is None:
        logger.warning("code missing in call back request.")
        flash("Validation error. Please retry.")
        return redirect(url_for("redash.login"))
    profile = get_user_profile(code)
    if profile is None:
        flash("Validation error. Please retry.") 
        return redirect(url_for("redash.login"))

    if "org_slug" in session:
        org = models.Organization.get_by_slug(session.pop("org_slug"))
    else:
        org = current_org

    if not verify_profile(org, profile):
        logger.warning(
            "User tried to login with unauthorized domain name: %s (org: %s)",
            profile["email"],
            org,
        )
        flash("Your microsoft Apps account ({}) isn't allowed.".format(profile["email"]))
        return redirect(url_for("redash.login", org_slug=org.slug))

    picture_url = profile.get('picture')
    user = create_and_login_user(org, profile["name"], profile["email"], picture_url)
    if user is None:
        return logout_and_redirect_to_index()

    unsafe_next_path = request.args.get("state") or url_for(
        "redash.index", org_slug=org.slug
    )
    next_path = get_next_path(unsafe_next_path)

    return redirect(next_path)