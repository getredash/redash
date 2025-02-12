import logging

import jwt
from jwt import PyJWKClient


logger = logging.getLogger("jwt_auth")

FILE_SCHEME_PREFIX = "file://"


def get_signing_key_from_file(url):
    file_path = url[len(FILE_SCHEME_PREFIX) :]
    with open(file_path) as key_file:
        key_str = key_file.read()

    get_signing_key.key_cache[url] = key_str
    return key_str


def get_signing_key_from_net(url, jwt_token):
    optional_custom_headers = {"User-agent": "redash"}
    client = PyJWKClient(url, headers=optional_custom_headers)
    # Gets the matching signing key from the JWKS endpoint
    signing_key = client.get_signing_key_from_jwt(jwt_token)
    get_signing_key.key_cache[url] = signing_key
    return signing_key


def get_signing_key(url, jwt_token):
    """
    Returns:
        Signing key for given jwt_token.
    """
    key_cache = get_signing_key.key_cache
    key = {}
    if url in key_cache:
        key = key_cache[url]
    else:
        if url.startswith(FILE_SCHEME_PREFIX):
            key = [get_signing_key_from_file(url)]
        else:
            key = get_signing_key_from_net(url, jwt_token)
    return key

#This cache shoud have a lifespan
get_signing_key.key_cache = {}

def verify_jwt_token(jwt_token, expected_issuer, expected_audience, algorithms, public_certs_url):
    # https://developers.cloudflare.com/access/setting-up-access/validate-jwt-tokens/
    # https://cloud.google.com/iap/docs/signed-headers-howto
    key = get_signing_key(public_certs_url, jwt_token)
    valid_token = False
    payload = None
    try:
        # decode returns the claims which has the email if you need it
        payload = jwt.decode(jwt_token, key=key, audience=expected_audience, algorithms=algorithms)
        issuer = payload["iss"]
        if issuer != expected_issuer:
            raise Exception("Wrong issuer: {}".format(issuer))
        valid_token = True
    except Exception as e:
        logging.exception(e)

    return payload, valid_token
