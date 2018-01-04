import os
from .helpers import parse_boolean

if os.environ.get("REDASH_SAML_LOCAL_METADATA_PATH") is not None:
    print "DEPRECATION NOTICE:\n"
    print "SAML_LOCAL_METADATA_PATH is no longer supported. Only URL metadata is supported now, please update"
    print "your configuration and reload."
    raise SystemExit(1)


PASSWORD_LOGIN_ENABLED = parse_boolean(os.environ.get("REDASH_PASSWORD_LOGIN_ENABLED", "true"))

SAML_METADATA_URL = os.environ.get("REDASH_SAML_METADATA_URL", "")
SAML_ENTITY_ID = os.environ.get("REDASH_SAML_ENTITY_ID", "")
SAML_NAMEID_FORMAT = os.environ.get("REDASH_SAML_NAMEID_FORMAT", "")
SAML_LOGIN_ENABLED = SAML_METADATA_URL != ""

DATE_FORMAT = os.environ.get("REDASH_DATE_FORMAT", "DD/MM/YY")

settings = {
    "auth_password_login_enabled": PASSWORD_LOGIN_ENABLED,
    "auth_saml_enabled": SAML_LOGIN_ENABLED,
    "auth_saml_entity_id": SAML_ENTITY_ID,
    "auth_saml_metadata_url": SAML_METADATA_URL,
    "auth_saml_nameid_format": SAML_NAMEID_FORMAT,
    "date_format": DATE_FORMAT
}
