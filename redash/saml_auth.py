import logging
from flask.ext.login import login_user
import requests
from flask import redirect, url_for, Blueprint, request
from flask_oauth import OAuth
from redash import models, settings
from saml2 import (
    BINDING_HTTP_POST,
    BINDING_HTTP_REDIRECT,
    entity,
)
from saml2.client import Saml2Client
from saml2.config import Config as Saml2Config


logger = logging.getLogger('saml_auth')

blueprint = Blueprint('saml_auth', __name__)

def get_saml_client():
    '''
    Return saml configuation.
    The configuration is a hash for use by saml2.config.Config
    '''

    acs_url = url_for(
        "saml_auth.idp_initiated",
        _external=True)
    https_acs_url = url_for(
        "saml_auth.idp_initiated",
        _external=True,
        _scheme='https')

    # NOTE:
    #   Ideally, this should fetch the metadata and pass it to
    #   PySAML2 via the "inline" metadata type.
    #   However, this method doesn't seem to work on PySAML2 v2.4.0
    #
    #   SAML metadata changes very rarely. On a production system,
    #   this data should be cached as approprate for your production system.
    rv = requests.get(settings.SAML_METADATA_URL)
    import tempfile
    tmp = tempfile.NamedTemporaryFile()
    f = open(tmp.name, 'w')
    f.write(rv.text)
    f.close()

    saml_settings = {
        'metadata': {
            # 'inline': metadata,
            "local": [tmp.name]
            },
        'service': {
            'sp': {
                'endpoints': {
                    'assertion_consumer_service': [
                        (acs_url, BINDING_HTTP_REDIRECT),
                        (acs_url, BINDING_HTTP_POST),
                        (https_acs_url, BINDING_HTTP_REDIRECT),
                        (https_acs_url, BINDING_HTTP_POST)
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
    spConfig = Saml2Config()
    spConfig.load(saml_settings)
    spConfig.allow_unknown_attributes = True
    saml_client = Saml2Client(config=spConfig)
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
    try:
        user_object = models.User.get(models.User.email == email)
        if user_object.name != name:
            logger.debug("Updating user name (%r -> %r)", user_object.name, name)
            user_object.name = name
            user_object.save()
    except models.User.DoesNotExist:
        logger.debug("Creating user object (%r)", name)
        user_object = models.User.create(name=name, email=email, groups=models.User.DEFAULT_GROUPS)

    user = User(email)
    session['saml_attributes'] = authn_response.ava
    login_user(user)
    url = url_for('index')

    return redirect(url)

@blueprint.route("/saml/login")
def sp_initiated():
    if not settings.SAML_METADATA_URL:
      logger.error("Cannot invoke saml endpoint without metadata url in settings.")
      return redirect(url_for('index'))

    saml_client = get_saml_client()
    reqid, info = saml_client.prepare_for_authenticate()

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