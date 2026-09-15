# Design Record: Our Single Sign-On Is Not Redash's JWT Support

## Context

core-backend hands a signed-in person over to the dashboards without a second login. Redash already has JWT authentication, reading a token is the same job in both, and the first implementation was built by configuring and extending it — sharing its `REDASH_JWT_*` settings and its request loader.

That turned out to be two different features wearing one name. Four bugs came out of the mismatch, each found by a person clicking and each passing a green suite at the time.

---

## Decision

Single sign-on from core-backend is an authentication provider of ours, in `redash/authentication/metr_sso.py`, beside `saml_auth` and `ldap_auth`. Redash's own JWT support is left switched off and unmodified.

---

## What Redash's JWT Support Is For

It arrived in September 2018 for **identity-aware proxies**, and `redash/authentication/jwt_auth.py` still cites the two it was written against — Cloudflare Access and Google IAP. Those sit *in front of* Redash and inject a token on every request. In that arrangement:

- the proxy authenticates the person, and owns logging out
- Redash cannot be reached except through the proxy, so its login page is moot
- the token is a **continuous assertion**, deliberately standing and refreshed
- password login is normally off, so there is one source of identity

Given all that, a Flask-Login `request_loader` is exactly right: per-request, stateless, no session of its own. Answering `401` for a bad token is right too, because a bad token from your own proxy is a fault worth surfacing. The original pull request had a blueprint and removed it — a proxy has no moment of hand-off, so there is nothing for a route to receive.

## What Ours Is For

core-backend sits *beside* the dashboards, not in front. It mints one token and redirects. Every assumption above is inverted:

| Redash's JWT assumes | we have |
|---|---|
| a proxy owns logout and keeps re-injecting | one mint, and nothing to revoke it |
| one source of identity | password login on, deliberately, for the migration |
| a token from a trusted proxy, always fresh | a cookie that may be stale, rotated, or another deployment's |

The four bugs, all of them consequences of the inversion:

1. **Logging out did nothing.** The session cleared, the cookie did not, and the next request presented it again.
2. **A session outranked the hand-off.** Arriving as somebody else left the earlier person signed in — and handed them their identity on logout.
3. **A malformed cookie was a 500 on every page.** The key id is read before any key is tried, so it escaped the verification loop.
4. **The login form was unreachable**, which is what somebody wanting to sign in as themselves needs.

---

## What Follows From It

**The token is spent on arrival.** Verified, exchanged for a session, deleted. It is a ticket, not a standing credential.

**Arriving replaces whoever was signed in**, and the previous visitor is signed *out* first. A session outranks anything a request carries, and `login_user` leaves the remember cookie alone, from which Flask-Login rebuilds a session unasked.

**A credential we cannot use is no credential, not a failed authentication.** The cookie is scoped to the domain every deployment shares, so stale, foreign and malformed tokens are routine. Refusing quietly and showing the login form is the only behaviour that leaves a way out.

**The tenant claim is the only thing separating one client from another.** core-backend signs every tenant with the same key, the same issuer and the same audience; only the slug in the claim differs. Its JWKS is served from each tenant's host, but that is multi-tenant routing, not a per-tenant key, so a token minted for one client verifies against another client's URL. Nothing else in the token would refuse it. That is why the app refuses to start when the claim is not configured.

**Only the signature check is shared.** `jwt_auth.verify_jwt_token` is called and not modified. The login button, the callback, the tenant claim and the standard group have no counterpart upstream.

---

## What It Costs Upstream

Two lines in `redash/authentication/__init__.py` — an import and an `init_app` call. The spike's earlier shape, built on Redash's own JWT support, touched over a hundred and sixty lines across the authentication files upstream revises most often. Three further files carry small edits that have nowhere else to live: the login template, the admin user form, and the user handler that refuses an email change.

The two features can be enabled independently, so a deployment that ever did sit behind an identity-aware proxy could switch Redash's JWT support back on without touching ours.

---

## Consequences

- The spike configured this through `REDASH_JWT_*`, and invented a `REDASH_JWT_LOGIN_URL` that upstream does not have. Those names mean nothing here. An environment still carrying them has the hand-off switched off: no login button, and `No hand-off token on the request` in the log the first time core-backend sends somebody over.
- The tenant claim is the isolation boundary and the app refuses to start without it configured.
- **Rotating the signing key requires restarting the dashboards, and that is part of the rotation.** `jwt_auth` caches public keys in a dict on the function object, per process, and never refreshes them; core-backend publishes one key at a time, so a rotation is a hard cutover on both sides. Until the dashboards restart, every worker still holding the old key refuses every hand-off — and because a refused token is deleted, the visitor has to start again from core-backend rather than retrying. Do not wait it out: the web server runs four gunicorn workers recycled independently every thousand requests or so, so left alone the fleet recovers raggedly over hours, with the same person succeeding or failing depending which worker answers. Restarting makes it one short, uniform outage instead.

  A ten-minute TTL on the cache was built and then removed. It bounded the window without closing it, and closing it properly means re-fetching when a signature fails, which has to be rate-limited because stale cookies on the shared domain are routine rather than exceptional. At our number of users a coordinated restart is cheaper than carrying that machinery.

- There is no single logout. core-backend deletes the hand-off cookie when somebody logs out there, so no *further* hand-off happens, but an open dashboards session survives.
