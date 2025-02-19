import logging

from authlib.integrations.flask_client import OAuth
from flask import Blueprint, flash, redirect, request, session, url_for

from redash import models, settings
from redash.authentication import (
    create_and_login_user,
    get_next_path,
    logout_and_redirect_to_index,
)
from redash.authentication.org_resolving import current_org

logger = logging.getLogger(__name__)


def verify_account(org, email):
    if org.is_public:
        return True

    domain = email.split("@")[-1]
    logger.info(f"org domains: {org.oidc_domains}")

    if domain in org.oidc_domains:
        return True

    if org.has_user(email) == 1:
        return True

    return False


def ensure_required_scope(scope):
    """
    Ensures that the required scopes 'openid', 'email', and 'profile' are present in the scope string.
    """
    scope_set = set(scope.split()) if scope else set()
    required_scopes = {"openid", "email", "profile"}
    scope_set.update(required_scopes)
    return " ".join(scope_set)


def get_name_from_user_info(user_info):
    name = user_info.get("name")
    if not name:
        given_name = user_info.get("given_name", "")
        family_name = user_info.get("family_name", "")
        name = f"{given_name} {family_name}".strip()
    if not name:
        name = user_info.get("preferred_username", "")
    if not name:
        name = user_info.get("nickname", "")
    return name


def create_oidc_blueprint(app):
    if not settings.OIDC_ENABLED:
        return None

    oauth = OAuth(app)

    blueprint = Blueprint("oidc", __name__)

    oauth = OAuth(app)
    scope = ensure_required_scope(settings.OIDC_SCOPE)
    oauth.register(
        name="oidc",
        server_metadata_url=settings.OIDC_ISSUER_URL,
        client_kwargs={
            "scope": scope,
        },
    )

    @blueprint.route("/<org_slug>/oidc", endpoint="authorize_org")
    def org_login(org_slug):
        session["org_slug"] = current_org.slug
        return redirect(url_for(".authorize", next=request.args.get("next", None)))

    @blueprint.route("/oidc", endpoint="authorize")
    def login():
        redirect_uri = url_for(".callback", _external=True)

        next_path = request.args.get("next", url_for("redash.index", org_slug=session.get("org_slug")))
        logger.debug("Callback url: %s", redirect_uri)
        logger.debug("Next is: %s", next_path)

        session["next_url"] = next_path

        return oauth.oidc.authorize_redirect(redirect_uri)

    @blueprint.route("/oidc/callback", endpoint="callback")
    def authorized():
        logger.debug("Authorized user inbound")

        token = oauth.oidc.authorize_access_token()
        user_info = oauth.oidc.parse_id_token(token)
        if user_info:
            session["user"] = user_info
        else:
            logger.warning("Unable to get userinfo from returned token")
            flash("Validation error. Please retry.")
            return redirect(url_for("redash.login"))

        access_token = token["access_token"]

        if access_token is None:
            logger.warning("Access token missing in the callback request.")
            flash("Validation error. Please retry.")
            return redirect(url_for("redash.login"))

        if "org_slug" in session:
            org = models.Organization.get_by_slug(session.pop("org_slug"))
        else:
            org = current_org

        if not verify_account(org, user_info["email"]):
            logger.warning(
                "User tried to login with unauthorized domain name: %s (org: %s)",
                user_info["email"],
                org,
            )
            flash("Your account ({}) isn't allowed.".format(user_info["email"]))
            return redirect(url_for("redash.login", org_slug=org.slug))

        # see if email is verified
        email_verified = user_info.get("email_verified", False)
        if not email_verified:
            flash("Email not verified.")
            return redirect(url_for("redash.login"))

        user_name = get_name_from_user_info(user_info)

        user = create_and_login_user(org, user_name, user_info["email"])
        if user is None:
            return logout_and_redirect_to_index()

        unsafe_next_path = session.get("next_url") or url_for("redash.index", org_slug=org.slug)
        next_path = get_next_path(unsafe_next_path)

        return redirect(next_path)

    return blueprint
