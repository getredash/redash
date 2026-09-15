# Design Record: METR Settings Live in Their Own Module

## Context

Single sign-on needed eight settings. The obvious home was `redash/settings/organization.py`, whose `settings` dict is how Redash exposes per-organization configuration, and which already carries `auth_jwt_login_enabled` and friends.

---

## Decision

METR-specific settings live in `redash/settings/metr.py`, read from the environment at import, and are not added to the organization settings dict.

---

## Why Not the Organization Settings Dict

**It is what upstream appends to.** Every Redash release that adds a setting edits that dict, so anything we add there conflicts on every merge, in a file we would otherwise never touch.

**It is also the wrong place semantically.** Values in that dict can be overridden per organization through the settings API. Nothing here is read that way — `metr_sso` reads the module directly — so an override would be accepted, stored, and then quietly ignored. A setting that looks configurable and is not is worse than one that never offered.

---

## Why Deployment-Wide, With `{org_slug}`

One configuration serves every organization, including ones created later. Where a value has to name an organization, it carries `{org_slug}` and the substitution happens per request:

```
REDASH_METR_SSO_LOGIN_URL=https://api.{org_slug}.metr.systems/sso/dashboards/
REDASH_METR_SSO_JWKS_URL=https://api.{org_slug}.metr.systems/sso/dashboards/jwks.json
```

A URL with no placeholder is used exactly as it stands, which is what a single-organization installation wants.

The alternative — configuring one organization's URL and letting the others inherit it — makes every tenant depend on one of them, and means a new organization is not reachable until somebody edits the deployment.

Note what `{org_slug}` in the JWKS URL does *not* buy. core-backend signs every tenant with one private key, mounted once on its web deployment; the URL varies because its multi-tenancy serves everything from the tenant's own host, not because the key does. Addressing the keys per tenant is therefore not an isolation boundary — see [standard_group_provisioning.md](standard_group_provisioning.md) for what is.

---

## The Settings

| Setting | What it is |
|---|---|
| `REDASH_METR_SSO_LOGIN_URL` | Where the login button sends somebody. Empty disables the feature. |
| `REDASH_METR_SSO_JWKS_URL` | Where to fetch the public signing key. One key serves every tenant; the URL is per-tenant only because that is how core-backend's multi-tenancy routes. |
| `REDASH_METR_SSO_ISSUER` | Expected `iss`. Deployment-wide; core-backend signs every tenant with the same one. |
| `REDASH_METR_SSO_AUDIENCE` | Expected `aud`. Deployment-wide for the same reason. |
| `REDASH_METR_SSO_ALGORITHMS` | Comma separated. `RS256`. |
| `REDASH_METR_SSO_COOKIE_NAME` | The cookie the token rides on. |
| `REDASH_METR_SSO_COOKIE_DOMAIN` | The domain to delete it from, since it is set on the shared parent. |
| `REDASH_METR_SSO_TENANT_CLAIM` | The claim naming the tenant. The app refuses to start without it. |

---

## Consequences

- Nothing here is visible or editable in the organization settings UI, by design.
- A new METR feature needing configuration adds to this module rather than to upstream's.
- `LEGACY_JWT_LOGIN_URL` exists only to detect a deployment left on the settings this feature used to borrow, and to refuse to start.
