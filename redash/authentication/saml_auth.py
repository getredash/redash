import logging

from flask import Blueprint, flash, redirect, request, url_for
from saml2 import BINDING_HTTP_POST, BINDING_HTTP_REDIRECT, entity
from saml2.client import Saml2Client
from saml2.config import Config as Saml2Config
from saml2.saml import NAMEID_FORMAT_TRANSIENT
from saml2.sigver import get_xmlsec_binary

from redash import settings
from redash.authentication import (
    create_and_login_user,
    logout_and_redirect_to_index,
)
from redash.authentication.org_resolving import current_org
from redash.handlers.base import org_scoped_rule
from redash.utils import mustache_render

logger = logging.getLogger("saml_auth")
blueprint = Blueprint("saml_auth", __name__)
inline_metadata_template = """<?xml version="1.0" encoding="UTF-8"?><md:EntityDescriptor entityID="{{entity_id}}" xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"><md:IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"><md:KeyDescriptor use="signing"><ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:X509Data><ds:X509Certificate>{{x509_cert}}</ds:X509Certificate></ds:X509Data></ds:KeyInfo></md:KeyDescriptor><md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="{{sso_url}}"/><md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="{{sso_url}}"/></md:IDPSSODescriptor></md:EntityDescriptor>"""


def get_saml_client(org):
    """
    Return SAML configuration.

    The configuration is a hash for use by saml2.config.Config
    """

    saml_type = org.get_setting("auth_saml_type")
    entity_id = org.get_setting("auth_saml_entity_id")
    sso_url = org.get_setting("auth_saml_sso_url")
    x509_cert = org.get_setting("auth_saml_x509_cert")
    metadata_url = org.get_setting("auth_saml_metadata_url")
    sp_settings = org.get_setting("auth_saml_sp_settings")

    if settings.SAML_SCHEME_OVERRIDE:
        acs_url = url_for(
            "saml_auth.idp_initiated",
            org_slug=org.slug,
            _external=True,
            _scheme=settings.SAML_SCHEME_OVERRIDE,
        )
    else:
        acs_url = url_for("saml_auth.idp_initiated", org_slug=org.slug, _external=True)

    saml_settings = {
        "metadata": {"remote": [{"url": metadata_url}]},
        "service": {
            "sp": {
                "endpoints": {
                    "assertion_consumer_service": [
                        (acs_url, BINDING_HTTP_REDIRECT),
                        (acs_url, BINDING_HTTP_POST),
                    ]
                },
                # Don't verify that the incoming requests originate from us via
                # the built-in cache for authn request ids in pysaml2
                "allow_unsolicited": True,
                # Don't sign authn requests, since signed requests only make
                # sense in a situation where you control both the SP and IdP
                "authn_requests_signed": False,
                "logout_requests_signed": True,
                "want_assertions_signed": True,
                "want_response_signed": False,
            }
        },
    }

    if settings.SAML_ENCRYPTION_ENABLED:
        encryption_dict = {
            "xmlsec_binary": get_xmlsec_binary(),
            "encryption_keypairs": [
                {
                    "key_file": settings.SAML_ENCRYPTION_PEM_PATH,
                    "cert_file": settings.SAML_ENCRYPTION_CERT_PATH,
                }
            ],
        }
        saml_settings.update(encryption_dict)

    if saml_type is not None and saml_type == "static":
        metadata_inline = mustache_render(
            inline_metadata_template,
            entity_id=entity_id,
            x509_cert=x509_cert,
            sso_url=sso_url,
        )

        saml_settings["metadata"] = {"inline": [metadata_inline]}

    if entity_id is not None and entity_id != "":
        saml_settings["entityid"] = entity_id

    if sp_settings:
        import json

        saml_settings["service"]["sp"].update(json.loads(sp_settings))

    sp_config = Saml2Config()
    sp_config.load(saml_settings)
    sp_config.allow_unknown_attributes = True
    saml_client = Saml2Client(config=sp_config)

    return saml_client


@blueprint.route(org_scoped_rule("/saml/callback"), methods=["POST"])
def idp_initiated(org_slug=None):
    if not current_org.get_setting("auth_saml_enabled"):
        logger.error("SAML Login is not enabled")
        return redirect(url_for("redash.index", org_slug=org_slug))

    saml_client = get_saml_client(current_org)
    try:
        authn_response = saml_client.parse_authn_request_response(
            request.form["SAMLResponse"], entity.BINDING_HTTP_POST
        )
    except Exception:
        logger.error("Failed to parse SAML response", exc_info=True)
        flash("SAML login failed. Please try again later.")
        return redirect(url_for("redash.login", org_slug=org_slug))

    authn_response.get_identity()
    user_info = authn_response.get_subject()
    email = user_info.text
    name = "%s %s" % (
        authn_response.ava["FirstName"][0],
        authn_response.ava["LastName"][0],
    )

    # This is what as known as "Just In Time (JIT) provisioning".
    # What that means is that, if a user in a SAML assertion
    # isn't in the user store, we create that user first, then log them in
    user = create_and_login_user(current_org, name, email)
    if user is None:
        return logout_and_redirect_to_index()

    if "RedashGroups" in authn_response.ava:
        group_names = authn_response.ava.get("RedashGroups")
        user.update_group_assignments(group_names)

    url = url_for("redash.index", org_slug=org_slug)

    return redirect(url)


@blueprint.route(org_scoped_rule("/saml/login"))
def sp_initiated(org_slug=None):
    if not current_org.get_setting("auth_saml_enabled"):
        logger.error("SAML Login is not enabled")
        return redirect(url_for("redash.index", org_slug=org_slug))

    saml_client = get_saml_client(current_org)
    nameid_format = current_org.get_setting("auth_saml_nameid_format")
    if nameid_format is None or nameid_format == "":
        nameid_format = NAMEID_FORMAT_TRANSIENT

    _, info = saml_client.prepare_for_authenticate(nameid_format=nameid_format)

    redirect_url = None
    # Select the IdP URL to send the AuthN request to
    for key, value in info["headers"]:
        if key == "Location":
            redirect_url = value
    response = redirect(redirect_url, code=302)

    # NOTE:
    #   I realize I _technically_ don't need to set Cache-Control or Pragma:
    #     https://stackoverflow.com/a/5494469
    #   However, Section 3.2.3.2 of the SAML spec suggests they are set:
    #     http://docs.oasis-open.org/security/saml/v2.0/saml-bindings-2.0-os.pdf
    #   We set those headers here as a "belt and suspenders" approach,
    #   since enterprise environments don't always conform to RFCs
    response.headers["Cache-Control"] = "no-cache, no-store"
    response.headers["Pragma"] = "no-cache"
    return response
