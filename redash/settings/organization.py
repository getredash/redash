import os
from .helpers import parse_boolean, check_saml_settings_security

if os.environ.get("REDASH_SAML_LOCAL_METADATA_PATH") is not None:
    print "DEPRECATION NOTICE:\n"
    print "SAML_LOCAL_METADATA_PATH is no longer supported. Only URL metadata is supported now, please update"
    print "your configuration and reload."
    raise SystemExit(1)


PASSWORD_LOGIN_ENABLED = parse_boolean(os.environ.get("REDASH_PASSWORD_LOGIN_ENABLED", "true"))

SAML_METADATA_URL = os.environ.get("REDASH_SAML_METADATA_URL", "")
SAML_ENTITY_ID = os.environ.get("REDASH_SAML_ENTITY_ID", "")
SAML_NAMEID_FORMAT = os.environ.get("REDASH_SAML_NAMEID_FORMAT", "")
SAML_WANT_ASSERTIONS_SIGNED = parse_boolean(os.environ.get("REDASH_SAML_WANT_ASSERTIONS_SIGNED", "true"))
SAML_WANT_RESPONSE_SIGNED = parse_boolean(os.environ.get("REDASH_SAML_WANT_RESPONSE_SIGNED", "false"))
SAML_LOGIN_ENABLED = SAML_METADATA_URL != ""

DATE_FORMAT = os.environ.get("REDASH_DATE_FORMAT", "DD/MM/YY")

settings = {
    "auth_password_login_enabled": PASSWORD_LOGIN_ENABLED,
    "auth_saml_enabled": SAML_LOGIN_ENABLED,
    "auth_saml_entity_id": SAML_ENTITY_ID,
    "auth_saml_metadata_url": SAML_METADATA_URL,
    "auth_saml_nameid_format": SAML_NAMEID_FORMAT,
    "auth_saml_want_assertions_signed": SAML_WANT_ASSERTIONS_SIGNED,
    "auth_saml_want_response_signed": SAML_WANT_RESPONSE_SIGNED,
    "date_format": DATE_FORMAT
}

try:
    check_saml_settings_security(settings)
except Exception as e:
    print(e)
    print('One of the following options must be enabled for secure SAML authentication:')
    print('- REDASH_SAML_WANT_ASSERTIONS_SIGNED')
    print('- REDASH_SAML_WANT_RESPONSE_SIGNED')
    print('Enable one or both options according to your IDP configuration and restart Redash')
    raise SystemExit(1)
