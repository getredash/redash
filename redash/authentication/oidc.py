import logging

from authlib.common.errors import AuthlibBaseError
from authlib.integrations.flask_client import OAuth
from flask import Blueprint, flash, redirect, request, session, url_for
from joserfc.errors import JoseError
from requests.exceptions import RequestException

from redash import models, settings
from redash.authentication import (
    create_and_login_user,
    get_next_path,
    logout_and_redirect_to_index,
)
from redash.authentication.org_resolving import current_org

logger = logging.getLogger(__name__)


def _build_server_metadata_url(issuer_url):
    """Build the OIDC discovery URL from the issuer URL.

    Accepts either the full .well-known URL or just the issuer URL.
    """
    if issuer_url.endswith("/.well-known/openid-configuration"):
        return issuer_url
    return issuer_url.rstrip("/") + "/.well-known/openid-configuration"


def verify_account(org, email):
    if org.is_public:
        return True

    domain = email.split("@")[-1].lower()
    logger.debug("org domains: %s", org.oidc_domains)

    if domain in [d.lower() for d in org.oidc_domains]:
        return True

    if org.has_user(email):
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


def get_name_from_user_info(userinfo):
    name = userinfo.get("name")
    if not name:
        given_name = userinfo.get("given_name", "")
        family_name = userinfo.get("family_name", "")
        name = f"{given_name} {family_name}".strip()
    if not name:
        name = userinfo.get("preferred_username", "")
    if not name:
        name = userinfo.get("nickname", "")
    return name


def _session_org_slug():
    # In multi-org mode url_for needs a slug; fall back when the session lacks one
    return session.get("org_slug") or current_org.slug


def create_oidc_blueprint(app):
    if not settings.OIDC_ENABLED:
        return None

    blueprint = Blueprint("oidc", __name__)

    oauth = OAuth(app)
    scope = ensure_required_scope(settings.OIDC_SCOPE)
    oauth.register(
        name="oidc",
        client_id=settings.OIDC_CLIENT_ID,
        client_secret=settings.OIDC_CLIENT_SECRET,
        server_metadata_url=_build_server_metadata_url(settings.OIDC_ISSUER_URL),
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
        scheme = settings.OIDC_SCHEME_OVERRIDE or None
        redirect_uri = url_for(".callback", _external=True, _scheme=scheme)

        next_path = request.args.get("next", url_for("redash.index", org_slug=_session_org_slug()))
        logger.debug("Callback url: %s", redirect_uri)
        logger.debug("Next is: %s", next_path)

        session["next_url"] = next_path

        return oauth.oidc.authorize_redirect(redirect_uri)

    @blueprint.route("/oidc/callback", endpoint="callback")
    def authorized():
        logger.debug("Authorized user inbound")

        try:
            token = oauth.oidc.authorize_access_token()
            # Authlib validates the ID token, including its nonce, during the exchange.
            userinfo = token.get("userinfo") if token.get("id_token") else None
            if userinfo and not userinfo.get("email"):
                metadata = oauth.oidc.load_server_metadata()
                if metadata.get("userinfo_endpoint"):
                    profile = oauth.oidc.userinfo(token=token)
                    # OIDC requires the UserInfo subject to match the validated ID token.
                    if not userinfo.get("sub") or profile.get("sub") != userinfo["sub"]:
                        logger.warning("OIDC UserInfo subject does not match ID token")
                        flash("Validation error. Please retry.")
                        return redirect(url_for("redash.login", org_slug=_session_org_slug()))
                    userinfo = {**userinfo, **profile}
        except (AuthlibBaseError, JoseError, RequestException) as e:
            logger.warning("Failed to authenticate with OIDC provider: %s", e)
            flash("Validation error. Please retry.")
            return redirect(url_for("redash.login", org_slug=_session_org_slug()))

        if not userinfo:
            logger.warning("Unable to get userinfo from returned token")
            flash("Validation error. Please retry.")
            return redirect(url_for("redash.login", org_slug=_session_org_slug()))

        if "org_slug" in session:
            org = models.Organization.get_by_slug(session.pop("org_slug"))
        else:
            org = current_org

        email = userinfo.get("email")
        if not email:
            logger.warning("OIDC provider did not return an email claim")
            flash("Email claim missing from OIDC provider response.")
            return redirect(url_for("redash.login", org_slug=org.slug))

        if not verify_account(org, email):
            logger.warning(
                "User tried to login with unauthorized domain name: %s (org: %s)",
                email,
                org,
            )
            flash("Your account ({}) isn't allowed.".format(email))
            return redirect(url_for("redash.login", org_slug=org.slug))

        # The optional claim must be a JSON boolean when present.
        if "email_verified" in userinfo and userinfo["email_verified"] is not True:
            flash("Email not verified.")
            return redirect(url_for("redash.login", org_slug=org.slug))

        user_name = get_name_from_user_info(userinfo)

        user = create_and_login_user(org, user_name, email)
        if user is None:
            return logout_and_redirect_to_index()

        unsafe_next_path = session.pop("next_url", None) or url_for("redash.index", org_slug=org.slug)
        next_path = get_next_path(unsafe_next_path)

        return redirect(next_path)

    return blueprint
