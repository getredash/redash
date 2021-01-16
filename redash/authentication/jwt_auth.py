import logging
import jwt
import requests
import simplejson

logger = logging.getLogger("jwt_auth")

# https://tools.ietf.org/html/rfc7518#section-6.1
jwt_algorithms = {
    "EC": jwt.algorithms.ECAlgorithm,
    "RSA": jwt.algorithms.RSAAlgorithm,
    "oct": jwt.algorithms.HMACAlgorithm
}

def get_public_keys(url):
    """
    Returns:
        List of RSA, EC or HMAC public keys usable by PyJWT.
    """
    key_cache = get_public_keys.key_cache
    if url in key_cache:
        return key_cache[url]
    else:
        r = requests.get(url)
        r.raise_for_status()
        data = r.json()
        if "keys" in data:
            public_keys = []
            for key_dict in data["keys"]:
                try:
                    algorithm = jwt_algorithms[key_dict["kty"]]
                except KeyError:
                    raise Exception("Unknown key type: {}".format(key_dict["kty"]))

                public_keys.append(algorithm.from_jwk(simplejson.dumps(key_dict)))

            get_public_keys.key_cache[url] = public_keys
            return public_keys
        else:
            get_public_keys.key_cache[url] = data
            return data


get_public_keys.key_cache = {}


def verify_jwt_token(
    jwt_token, expected_issuer, expected_audience, algorithms, public_certs_url
):
    # https://developers.cloudflare.com/access/setting-up-access/validate-jwt-tokens/
    # https://cloud.google.com/iap/docs/signed-headers-howto
    # Loop through the keys since we can't pass the key set to the decoder
    keys = get_public_keys(public_certs_url)

    key_id = jwt.get_unverified_header(jwt_token).get("kid", "")
    if key_id and isinstance(keys, dict):
        keys = [keys.get(key_id)]

    valid_token = False
    payload = None
    for key in keys:
        try:
            # decode returns the claims which has the email if you need it
            payload = jwt.decode(
                jwt_token, key=key, audience=expected_audience, algorithms=algorithms
            )
            issuer = payload["iss"]
            if issuer != expected_issuer:
                raise Exception("Wrong issuer: {}".format(issuer))
            valid_token = True
            break
        except Exception as e:
            logging.exception(e)
    return payload, valid_token
