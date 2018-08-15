import json
import jwt
import requests

from flask import Blueprint

blueprint = Blueprint('jwt_auth', __name__)


def get_public_keys(url):
    """
    Returns:
        List of RSA public keys usable by PyJWT.
    """
    if not hasattr(blueprint, 'jwt_auth_public_keys'):
        blueprint.jwt_auth_public_keys = dict()

    if url in blueprint.jwt_auth_public_keys:
        return blueprint.jwt_auth_public_keys[url]
    else:
        r = requests.get(url)
        public_keys = []
        jwk_set = r.json()
        for key_dict in jwk_set['keys']:
            public_key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key_dict))
            public_keys.append(public_key)
        blueprint.jwt_auth_public_keys[url] = public_keys
        return public_keys


def verify_jwt_token(token, audience, algorithms, public_certs_url):
    # https://cloud.google.com/iap/docs/signed-headers-howto
    # https://developers.cloudflare.com/access/setting-up-access/validate-jwt-tokens/
    # Loop through the keys since we can't pass the key set to the decoder
    keys = get_public_keys(public_certs_url)
    valid_token = False
    payload = None
    for key in keys:
        try:
            # decode returns the claims which has the email if you need it
            payload = jwt.decode(
                token,
                key=key,
                audience=audience,
                algorithms=algorithms
            )
            valid_token = True
            break
        except:
            pass
    return payload, valid_token
