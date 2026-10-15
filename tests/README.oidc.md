# Local OIDC verification

`TestOIDCFlow` in `test_authentication.py` starts a loopback identity provider
and exercises Authlib discovery, token exchange, JWKS signature validation,
nonce validation, UserInfo, and an authenticated Redash API request. It also
checks invalid signatures, expired tokens, wrong issuers/audiences/nonces,
replayed callbacks, mismatched UserInfo subjects, and rejected accounts.

Run it using the normal backend test database and Redis configuration:

```sh
pytest tests/test_authentication.py -k OIDC
```

For browser verification, use a **disposable local Redash database**. Configure
these settings before starting Redash, and allow `example.com` in the
organization's OIDC domains:

```sh
export REDASH_OIDC_CLIENT_ID=local-redash
export REDASH_OIDC_CLIENT_SECRET=local-secret
export REDASH_OIDC_ISSUER_URL=http://localhost:16485
export AUTHLIB_INSECURE_TRANSPORT=1  # local HTTP test provider only
python tests/oidc_provider.py --issuer http://localhost:16485 &
oidc_provider_pid=$!
```

Start Redash from this same shell so it inherits the exported settings. Stop
the provider after verification with `kill "$oidc_provider_pid"`.

The provider accepts password `test-only` for these fixture accounts:

| Account | Behavior |
| --- | --- |
| `verified@example.com` | Verified email in the signed ID token |
| `userinfo@example.com` | Email returned only by UserInfo |
| `unverified@example.com` | Unverified email; login must fail |
| `outsider@other.com` | Disallowed domain; login must fail |

Make `verified@example.com` an administrator in the disposable database to
exercise the settings test. With Redash running on `localhost:5001`, run:

```sh
CYPRESS_OIDC_ISSUER=http://localhost:16485 pnpm exec cypress run \
  --config baseUrl=http://localhost:5001,specPattern=client/cypress/oidc/login.cy.js,experimentalSessionAndOrigin=true \
  --spec client/cypress/oidc/login.cy.js
```

The browser suite signs in through the provider, checks the authenticated
session, rejects unverified/disallowed accounts, and saves/reloads OIDC-only
login settings. It is separate from the default Cypress suite because it
requires this provider and OIDC deployment configuration. This fixture tests
the protocol flow; it does not establish interoperability with live providers.
Never deploy the fixture or enable insecure transport in a real deployment.
