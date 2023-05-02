import logging
import requests
from flask import redirect, url_for, Blueprint, flash, request, session


from redash import models, settings
from redash.authentication import (
    create_and_login_user,
    logout_and_redirect_to_index,
    get_next_path,
)
from redash.authentication.org_resolving import current_org

from authlib.integrations.flask_client import OAuth


def create_oauth_blueprint(app):
    oauth = OAuth(app)

    logger = logging.getLogger("oauth")
    blueprint = Blueprint("oauth", __name__)

    CONF_URL = "http://ceres.boost.local:4000/oauth/.well-known/openid-configuration"
    oauth = OAuth(app)
    oauth.register(
        name="ceres",
        server_metadata_url=CONF_URL,
        client_kwargs={"scope": "openid email profile"},
    )

    def get_user_profile(access_token):
        headers = {"Authorization": "OAuth {}".format(access_token)}
        response = requests.get(
            "http://ceres.boost.local:4000/oauth/userinfo", headers=headers
        )

        if response.status_code == 401:
            logger.warning("Failed getting user profile (response code 401).")
            return None

        return response.json()

    # @blueprint.route("/<org_slug>/oauth/google", endpoint="authorize_org")
    # def org_login(org_slug):
    #     session["org_slug"] = current_org.slug
    #     return redirect(url_for(".authorize", next=request.args.get("next", None)))

    @blueprint.route("/oauth/ceres", endpoint="authorize")
    def login():

        redirect_uri = url_for(".callback", _external=True)

        next_path = request.args.get(
            "next", url_for("redash.index", org_slug=session.get("org_slug"))
        )
        logger.debug("Callback url: %s", redirect_uri)
        logger.debug("Next is: %s", next_path)

        session["next_url"] = next_path

        return oauth.ceres.authorize_redirect(redirect_uri)

    @blueprint.route("/oauth/ceres_callback", endpoint="callback")
    def authorized():

        logger.debug("Authorized user inbound")

        resp = oauth.ceres.authorize_access_token()
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

        picture_url = '' # "%s?sz=40" % profile["picture"]
        user = create_and_login_user(
            org, profile["name"], profile["email"], picture_url
        )
        if user is None:
            return logout_and_redirect_to_index()

        unsafe_next_path = session.get("next_url") or url_for(
            "redash.index", org_slug=org.slug
        )
        next_path = get_next_path(unsafe_next_path)

        return redirect(next_path)

    return blueprint
