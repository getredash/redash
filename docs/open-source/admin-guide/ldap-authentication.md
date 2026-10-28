---
title: LDAP/AD Authentication
---

Starting from Redash v3, there is direct support for LDAP/AD authentication. To
set it up you will need to install the `ldap3` Python package (version `2.2.4`,
GPL licensed) and add the relevant configuration values (see below). Once you
done both, you need to restart the application service.

## Configuration

Add the following to your environment variables (`.env` file or Docker
configuration):

- `REDASH_LDAP_LOGIN_ENABLED`: When `true` LDAP login will be enabled at
  `ldap/login` endpoint. **[Required]** \* If `REDASH_PASSWORD_LOGIN_ENABLED` is
  `false`, users will be prevented from logging in to Redash using Redash's
  authentication and will instead automatically be redirected to the LDAP login
  endpoint.
- `REDASH_LDAP_URL`: The URL of the LDAP/AD host. This includes port. Ex:
  `"127.0.0.1:389"` **[Required]**
- `REDASH_LDAP_BIND_DN`: The DN to bind to. This is used to determine the
  identity of the user being authenticated. **[Required]** \* For AD this should
  be `"org\\user_dn"`. The two slashes are required.
- `REDASH_LDAP_BIND_DN_PASSWORD`: The password to bind to the DN specified in
  `REDASH_LDAP_BIND_DN` **[Required]**
- `REDASH_LDAP_DISPLAY_NAME_KEY`: The key with the full name of the user. \*
  Default is `displayName`
- `REDASH_LDAP_EMAIL_KEY`: The key with the email of the user. \* Default is
  `mail`
- `REDASH_LDAP_CUSTOM_USERNAME_PROMPT`: A custom prompt to be displayed above
  the username field. \* Default is `LDAP/AD/SSO username:`
- `REDASH_LDAP_SEARCH_TEMPLATE`: The search template used by the DN to find the
  user. _ By default this is `"(cn=%(username)s)"`, but for AD it should be
  `"(sAMAccountName=%(username)s)"` _ `%(username)s` is the username entered in
  the ldap login page
- `REDASH_LDAP_SEARCH_DN`: The search DN to bind to. Ex.
  `"cn=users,dc=ORG,dc=local"` **[Required]**
  - Prior to 4.0, this option was called `REDASH_SEARCH_DN`

## Docker

If using LDAP in a docker setup, then you will have to create a custom image
(https://github.com/getredash/redash/pull/1836#issuecomment-321331014):

```
FROM redash/redash:latest

RUN pip install ldap3
```

If you're using Docker Compose to run Redash, you can replace
`image: redash/redash:latest` with `build: .` assuming the custom Dockerfile is
in the same directory.
