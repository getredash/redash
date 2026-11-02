"""Local-only OIDC provider for integration tests and browser verification.

Run with ``python -m tests.oidc_provider`` in a configured Redash test environment.
Use client ID ``local-redash``, secret ``local-secret``, and password ``test-only``.
This deliberately small test fixture must never be deployed as an identity provider.
"""

import argparse
import secrets
import threading
import time
from urllib.parse import urlencode

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from flask import Flask, abort, jsonify, redirect, render_template_string, request
from werkzeug.serving import make_server


class OIDCProvider:
    def __init__(self, port=0, host="127.0.0.1", issuer=None):
        self.key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        self.codes = {}
        self.tokens = {}
        self.bad_nonce = False
        self.bad_signature = False
        self.wrong_subject = False
        self.claims_override = {}
        self.app = Flask(__name__)
        self.server = make_server(host, port, self.app, threaded=True)
        self.issuer = issuer or "http://{}:{}".format(host, self.server.server_port)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self._register_routes()

    def start(self):
        self.thread.start()
        return self

    def stop(self):
        self.server.shutdown()
        self.thread.join(timeout=5)
        self.server.server_close()

    def _register_routes(self):
        @self.app.get("/.well-known/openid-configuration")
        def discovery():
            return jsonify(
                issuer=self.issuer,
                authorization_endpoint=self.issuer + "/authorize",
                token_endpoint=self.issuer + "/token",
                userinfo_endpoint=self.issuer + "/userinfo",
                jwks_uri=self.issuer + "/jwks",
                response_types_supported=["code"],
                subject_types_supported=["public"],
                id_token_signing_alg_values_supported=["RS256"],
                token_endpoint_auth_methods_supported=["client_secret_basic"],
            )

        @self.app.get("/jwks")
        def jwks():
            key = jwt.algorithms.RSAAlgorithm.to_jwk(self.key.public_key(), as_dict=True)
            return jsonify(keys=[dict(key, kid="local-test", use="sig", alg="RS256")])

        @self.app.route("/authorize", methods=["GET", "POST"])
        def authorize():
            if request.args.get("client_id") != "local-redash":
                abort(400)
            if request.method == "GET":
                return render_template_string(
                    """<!doctype html><title>Local OIDC sign in</title>
                    <h1>Local OIDC sign in</h1><form method="post">
                    <label>Email <input name="email" type="email" required></label>
                    <label>Password <input name="password" type="password" required></label>
                    <button>Sign in</button></form>
                    <p>Test password: test-only. Accounts: verified@example.com,
                    unverified@example.com, userinfo@example.com, outsider@other.com.</p>"""
                )
            if request.form.get("password") != "test-only":
                abort(403)
            email = request.form.get("email", "")
            if email not in {
                "verified@example.com",
                "unverified@example.com",
                "userinfo@example.com",
                "outsider@other.com",
            }:
                abort(403)
            code = secrets.token_urlsafe(24)
            self.codes[code] = dict(request.args, email=email)
            return redirect(
                request.args["redirect_uri"] + "?" + urlencode({"code": code, "state": request.args["state"]})
            )

        @self.app.post("/token")
        def token():
            auth = request.authorization
            if not auth or auth.username != "local-redash" or auth.password != "local-secret":
                abort(401)
            code = self.codes.pop(request.form.get("code"), None)
            if not code or code["redirect_uri"] != request.form.get("redirect_uri"):
                return jsonify(error="invalid_grant"), 400
            access_token = secrets.token_urlsafe(24)
            profile = {"sub": code["email"], "email": code["email"], "name": "OIDC Test User"}
            profile["email_verified"] = code["email"] != "unverified@example.com"
            self.tokens[access_token] = profile
            claims = dict(profile)
            if code["email"] == "userinfo@example.com":
                claims = {"sub": profile["sub"]}
            claims.update(
                iss=self.issuer,
                aud="local-redash",
                iat=int(time.time()),
                exp=int(time.time()) + 300,
                nonce="incorrect" if self.bad_nonce else code["nonce"],
            )
            claims.update(self.claims_override)
            key = rsa.generate_private_key(public_exponent=65537, key_size=2048) if self.bad_signature else self.key
            id_token = jwt.encode(claims, key, algorithm="RS256", headers={"kid": "local-test"})
            return jsonify(access_token=access_token, token_type="Bearer", expires_in=300, id_token=id_token)

        @self.app.get("/userinfo")
        def userinfo():
            token = request.headers.get("Authorization", "").removeprefix("Bearer ")
            if token not in self.tokens:
                abort(401)
            profile = self.tokens[token]
            return jsonify(dict(profile, sub="different-subject") if self.wrong_subject else profile)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=16485)
    parser.add_argument("--issuer")
    args = parser.parse_args()
    provider = OIDCProvider(port=args.port, host=args.host, issuer=args.issuer)
    print("Local test issuer: " + provider.issuer, flush=True)
    provider.server.serve_forever()
