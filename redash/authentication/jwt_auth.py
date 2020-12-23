import logging
import jwt
import requests
import simplejson

logger = logging.getLogger("jwt_auth")


def get_public_keys(url,token):
    """
    Returns:
        List of RSA public keys usable by PyJWT.
    """
    jsonObj = {'refreshToken': token}

    key_cache = get_public_keys.key_cache
    if url in key_cache:
        return key_cache[url]
    else:
        r = requests.post(url,data = jsonObj)
        r.raise_for_status()
        data = r.json()
        if "result" in data:
            public_keys = []
            public_keys.append(data["result"])
            print("Token Validated")
            # for key_dict in data["result"]:
            #     # public_key = jwt.algorithms.RSAAlgorithm.from_jwk(
            #     #     simplejson.dumps(key_dict)
            #     # )
            #     public_keys.append(key_dict)

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
    keys = get_public_keys(public_certs_url,jwt_token)
    print("Got Auth Verified From EcoSystem")
    key_id = jwt.get_unverified_header(jwt_token).get("kid", "")
    if key_id and isinstance(keys, dict):
        keys = [keys.get(key_id)]

    valid_token = False
    payload = None
    for key in keys:
        try:
            print("Issuer Key"+str(key))
            print("jwt token"+str(jwt_token))
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
