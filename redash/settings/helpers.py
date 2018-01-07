import json
import os
import urlparse


def parse_db_url(url):
    url_parts = urlparse.urlparse(url)
    connection = {'threadlocals': True}

    if url_parts.hostname and not url_parts.path:
        connection['name'] = url_parts.hostname
    else:
        connection['name'] = url_parts.path[1:]
        connection['host'] = url_parts.hostname
        connection['port'] = url_parts.port
        connection['user'] = url_parts.username
        connection['password'] = url_parts.password

    return connection


def fix_assets_path(path):
    fullpath = os.path.join(os.path.dirname(__file__), "../", path)
    return fullpath


def array_from_string(s):
    array = s.split(',')
    if "" in array:
        array.remove("")

    return array


def set_from_string(s):
    return set(array_from_string(s))


def parse_boolean(str):
    return json.loads(str.lower())


def int_or_none(value):
    if value is None:
        return value

    return int(value)

def check_saml_settings_security(settings):
    """Check SAML authentication for insecure settings.

    Raises Exception with a human readable message if settings are
    not secure.
    """
    if not settings.get("auth_saml_enabled"):
        # SAML not enabled. All good.
        return True

    # We must require that the IDP signs the entire response or
    # individual assertions (or both). If we don't require any
    # signatures, anyone can craft a valid and trusted SAML
    # response with arbitrary information
    if not settings.get("auth_saml_want_response_signed") and \
        not settings.get("auth_saml_want_assertions_signed"):
        raise Exception("SAML configuration must require signed responses, signed assertions or both.")

    # All good
    return True
