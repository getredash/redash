import logging
import requests
from flask import redirect, url_for, Blueprint, request
from redash.authentication.google_oauth import create_and_login_user
from redash.authentication.org_resolving import current_org
from redash import settings
from saml2 import BINDING_HTTP_POST, BINDING_HTTP_REDIRECT, entity
from saml2.client import Saml2Client
from saml2.config import Config as Saml2Config
from saml2.saml import NAMEID_FORMAT_TRANSIENT

logger = logging.getLogger('saml_auth')

blueprint = Blueprint('saml_auth', __name__)


def get_saml_client():
    """
    Return SAML configuration.

    The configuration is a hash for use by saml2.config.Config
    """
    if settings.SAML_CALLBACK_SERVER_NAME:
        acs_url = settings.SAML_CALLBACK_SERVER_NAME + url_for("saml_auth.idp_initiated")
    else:
        acs_url = url_for("saml_auth.idp_initiated", _external=True)

    # NOTE:
    #   Ideally, this should fetch the metadata and pass it to
    #   PySAML2 via the "inline" metadata type.
    #   However, this method doesn't seem to work on PySAML2 v2.4.0
    #
    #   SAML metadata changes very rarely. On a production system,
    #   this data should be cached as approprate for your production system.
    if settings.SAML_METADATA_URL != "":
        rv = requests.get(settings.SAML_METADATA_URL)
        import tempfile
        tmp = tempfile.NamedTemporaryFile()
        f = open(tmp.name, 'w')
        f.write(rv.text)
        f.close()
        metadata_path = tmp.name
    else:
        metadata_path = settings.SAML_LOCAL_METADATA_PATH

    saml_settings = {
        'metadata': {
            # 'inline': metadata,
            "local": [metadata_path]
        },
        'service': {
            'sp': {
                'endpoints': {
                    'assertion_consumer_service': [
                        (acs_url, BINDING_HTTP_REDIRECT),
                        (acs_url, BINDING_HTTP_POST)
                    ],
                },
                # Don't verify that the incoming requests originate from us via
                # the built-in cache for authn request ids in pysaml2
                'allow_unsolicited': True,
                # Don't sign authn requests, since signed requests only make
                # sense in a situation where you control both the SP and IdP
                'authn_requests_signed': False,
                'logout_requests_signed': True,
                'want_assertions_signed': True,
                'want_response_signed': False,
            },
        },
    }
    if settings.SAML_ENTITY_ID != "":
        saml_settings['entityid'] = settings.SAML_ENTITY_ID

    spConfig = Saml2Config()
    spConfig.load(saml_settings)
    spConfig.allow_unknown_attributes = True
    saml_client = Saml2Client(config=spConfig)
    if settings.SAML_METADATA_URL != "":
        tmp.close()

    return saml_client


@blueprint.route("/saml/callback", methods=['POST'])
def idp_initiated():
    saml_client = get_saml_client()
    authn_response = saml_client.parse_authn_request_response(
        request.form['SAMLResponse'],
        entity.BINDING_HTTP_POST)
    authn_response.get_identity()
    user_info = authn_response.get_subject()
    email = user_info.text
    name = "%s %s" % (authn_response.ava['FirstName'][0], authn_response.ava['LastName'][0])

    # This is what as known as "Just In Time (JIT) provisioning".
    # What that means is that, if a user in a SAML assertion
    # isn't in the user store, we create that user first, then log them in
    user = create_and_login_user(current_org, name, email)

    if 'RedashGroups' in authn_response.ava:
        group_names = authn_response.ava.get('RedashGroups')
        user.update_group_assignments(group_names)

    url = url_for('redash.index')

    return redirect(url)


@blueprint.route("/saml/login")
def sp_initiated():
    if not settings.SAML_METADATA_URL and not settings.SAML_LOCAL_METADATA_PATH:
        logger.error("Cannot invoke saml endpoint without metadata url in settings.")
        return redirect(url_for('redash.index'))

    saml_client = get_saml_client()
    if settings.SAML_NAMEID_FORMAT != "":
        nameid_format = settings.SAML_NAMEID_FORMAT
    else:
        nameid_format = NAMEID_FORMAT_TRANSIENT
    reqid, info = saml_client.prepare_for_authenticate(nameid_format=nameid_format)

    redirect_url = None
    # Select the IdP URL to send the AuthN request to
    for key, value in info['headers']:
        if key is 'Location':
            redirect_url = value
    response = redirect(redirect_url, code=302)
    # NOTE:
    #   I realize I _technically_ don't need to set Cache-Control or Pragma:
    #     http://stackoverflow.com/a/5494469
    #   However, Section 3.2.3.2 of the SAML spec suggests they are set:
    #     http://docs.oasis-open.org/security/saml/v2.0/saml-bindings-2.0-os.pdf
    #   We set those headers here as a "belt and suspenders" approach,
    #   since enterprise environments don't always conform to RFCs
    response.headers['Cache-Control'] = 'no-cache, no-store'
    response.headers['Pragma'] = 'no-cache'
    return response
