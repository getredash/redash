import logging

import requests
from authlib.integrations.flask_client import OAuth
from flask import Blueprint, flash, redirect, request, session, url_for

from redash import models
from redash.authentication import (
    create_and_login_user,
    get_next_path,
    logout_and_redirect_to_index,
)
from redash.authentication.org_resolving import current_org


def verify_profile(org, profile):
    if org.is_public:
        return True

    email = profile["email"]
    domain = email.split("@")[-1]

    if domain in org.google_apps_domains:
        return True

    if org.has_user(email) == 1:
        return True

    return False


def create_google_oauth_blueprint(app):
    oauth = OAuth(app)

    logger = logging.getLogger("google_oauth")
    blueprint = Blueprint("google_oauth", __name__)

    CONF_URL = "https://accounts.google.com/.well-known/openid-configuration"
    oauth = OAuth(app)
    oauth.register(
        name="google",
        server_metadata_url=CONF_URL,
        client_kwargs={"scope": "openid email profile"},
    )

    def get_user_profile(access_token):
        headers = {"Authorization": "OAuth {}".format(access_token)}
        response = requests.get("https://www.googleapis.com/oauth2/v1/userinfo", headers=headers)

        if response.status_code == 401:
            logger.warning("Failed getting user profile (response code 401).")
            return None

        return response.json()

    @blueprint.route("/<org_slug>/oauth/google", endpoint="authorize_org")
    def org_login(org_slug):
        session["org_slug"] = current_org.slug
        return redirect(url_for(".authorize", next=request.args.get("next", None)))

    @blueprint.route("/oauth/google", endpoint="authorize")
    def login():
        redirect_uri = url_for(".callback", _external=True)

        next_path = request.args.get("next", url_for("redash.index", org_slug=session.get("org_slug")))
        logger.debug("Callback url: %s", redirect_uri)
        logger.debug("Next is: %s", next_path)

        session["next_url"] = next_path

        return oauth.google.authorize_redirect(redirect_uri)

    @blueprint.route("/oauth/google_callback", endpoint="callback")
    def authorized():
        logger.debug("Authorized user inbound")

        resp = oauth.google.authorize_access_token()
        user = resp.get("userinfo")
        if user:
            session["user"] = user

        access_token = resp["access_token"]

        if access_token is None:
            logger.warning("Access token missing in call back request.")
            flash("Validation error. Please retry.")
            return redirect(url_for("redash.login"))

        profile = get_user_profile(access_token)
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
            flash("Your Google Apps account ({}) isn't allowed.".format(profile["email"]))
            return redirect(url_for("redash.login", org_slug=org.slug))

        picture_url = "%s?sz=40" % profile["picture"]
        user = create_and_login_user(org, profile["name"], profile["email"], picture_url)
        if user is None:
            return logout_and_redirect_to_index()

        unsafe_next_path = session.get("next_url") or url_for("redash.index", org_slug=org.slug)
        next_path = get_next_path(unsafe_next_path)

        return redirect(next_path)

    return blueprint
