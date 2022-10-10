import logging
import requests
import base64
import json
from flask import redirect, url_for, Blueprint, flash, request, session


from redash import models, settings
from redash.authentication import (
    create_and_login_user,
    logout_and_redirect_to_index,
    get_next_path,
)
from redash.authentication.org_resolving import current_org

from authlib.integrations.flask_client import OAuth


def verify_profile(org, profile):
    if org.is_public:
        return True

    email = profile["email"]
    domain = email.split("@")[-1]

    if domain in org.azure_apps_domains:
        return True

    if org.has_user(email) == 1:
        return True

    return False

def get_roles_in_id_token(id_token, logger):
    logger.debug("Validating ID token")
    id_token_parts = id_token.split(".")
    if len(id_token_parts) < 2:
        logger.warning("Malformed ID token")
    decoded_token_json = json.loads(base64.b64decode(id_token_parts[1] + '=='))
    logger.debug("Successfully decoded token")
    if "roles" in decoded_token_json:
        roles = decoded_token_json["roles"]
        logger.debug("Found roles: " + (", ".join(roles)))
        return roles
    return []

def verify_roles(org, roles, logger):
    if org.azure_roles:
        if not roles:
            return False
        for azure_role in org.azure_roles:
            logger.debug("Verifying role: " + azure_role)
            if azure_role in roles:
                logger.debug("Role verified: " + azure_role)
                return True
    return False

def create_azure_oauth_blueprint(app):
    logger = logging.getLogger("azure_oauth")
    blueprint = Blueprint("azure_oauth", __name__)

    if not settings.AZURE_TENANT_ID:
        # multi-tenant
        CONF_URL = "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration"
    else:
        CONF_URL = "https://login.microsoftonline.com/" + settings.AZURE_TENANT_ID + "/v2.0/.well-known/openid-configuration"

    oauth = OAuth(app)
    oauth.register(
        name="azure",
        server_metadata_url=CONF_URL,
        client_kwargs={"scope": "openid email profile"},
    )

    def get_user_profile(access_token):
        headers = {"Authorization": "Bearer {}".format(access_token)}

        response = requests.get(
            "https://graph.microsoft.com/oidc/userinfo", headers=headers
        )

        if response.status_code == 401:
            logger.warning("Failed getting user profile (response code 401).")
            return None

        return response.json()

    @blueprint.route("/<org_slug>/oauth/azure", endpoint="authorize_org")
    def org_login(org_slug):
        session["org_slug"] = current_org.slug
        return redirect(url_for(".authorize", next=request.args.get("next", None)))

    @blueprint.route("/oauth/azure", endpoint="authorize")
    def login():

        redirect_uri = url_for(".callback", _external=True)

        next_path = request.args.get(
            "next", url_for("redash.index", org_slug=session.get("org_slug"))
        )
        logger.debug("Callback url: %s", redirect_uri)
        logger.debug("Next is: %s", next_path)

        session["next_url"] = next_path

        return oauth.azure.authorize_redirect(redirect_uri)

    @blueprint.route("/oauth/azure_callback", endpoint="callback")
    def authorized():

        logger.debug("Authorized user inbound")

        resp = oauth.azure.authorize_access_token()
        user = resp.get("userinfo")
        if user:
            session["user"] = user

        access_token = resp["access_token"]
        id_token = resp["id_token"]

        if access_token is None:
            logger.warning("Access token missing in call back request.")
            flash("Validation error. Please retry.")
            return redirect(url_for("redash.login"))

        if id_token is None:
            logger.warning("Id token missing in call back request.")
            flash("Validation error. Please retry.")
            return redirect(url_for("redash.login"))

        if "org_slug" in session:
            org = models.Organization.get_by_slug(session.pop("org_slug"))
        else:
            org = current_org

        profile = get_user_profile(access_token)

        if org.azure_roles:
            roles = get_roles_in_id_token(id_token, logger)
        else:
            roles = []

        if not verify_roles(org, roles, logger):
            logger.warning(
                "User tried to login without authorized role assignment: %s. Valid roles are: %s. Provided roles are: %s",
                profile["email"],
                ", ".join(org.azure_roles),
                ", ".join(roles),
            )
            flash(
                "Your Azure AD account ({}) isn't allowed as you are not assigned a required role: {}. Your assigned roles are: {}".format(profile["email"], ", ".join(org.azure_roles), ", ".join(roles))
            )
            return redirect(url_for("redash.login", org_slug=org.slug))

        if profile is None:
            flash("Validation error. Please retry.")
            return redirect(url_for("redash.login"))

        if not verify_profile(org, profile):
            logger.warning(
                "User tried to login with unauthorized domain name: %s (org: %s)",
                profile["email"],
                org,
            )
            flash(
                "Your Azure AD account ({}) isn't allowed.".format(profile["email"])
            )
            return redirect(url_for("redash.login", org_slug=org.slug))

        # Do not read picture URL as applications often do not have Graph API permissions
        user = create_and_login_user(
            org, profile["name"], profile["email"]
        )
        if user is None:
            return logout_and_redirect_to_index()

        unsafe_next_path = session.get("next_url") or url_for(
            "redash.index", org_slug=org.slug
        )
        next_path = get_next_path(unsafe_next_path)

        return redirect(next_path)

    return blueprint
