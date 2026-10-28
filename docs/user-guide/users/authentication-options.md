---
title: Authentication Options (SSO, Google OAuth, SAML)
---

## Authentication Settings

Authentication options are configured through a mix of UI and Environment variables. To make changes in the UI visit the **Settings > General** tab.

:::note

Only admins can view and change authentication settings. Some authentication options will not appear in the UI until the corresponding environment variables have been set.

:::

## Password Login

By default, Redash authenticates users with an email address and password. This is called _Password Login_ on the **Settings > General** tab. After you enable an alternative authentication method you can disable password login.

:::note

Redash stores hashes of user passwords that were created through its default password configuration. The first time a user authenticates through SAML or Google Login, a user record is created but no password hash is stored. This is called Just-in-Time (JIT) provisioning. These users can _only_ log-in through the third-party authentication service.

If you use Password Login and subsequently enable Google OAuth or SAML 2.0, it's possible that a user with one email address has two passwords to log-in to Redash: their Google or SAML password, and their original Redash password.

We recommend disabling Password Login if all users are expected to authenticate through Google OAuth or SAML as it will reduce confusion.

:::

## Google Login (OAuth)

You can configure Redash to allow any user with a Google account from the domain(s) you designate to login to Redash. If they don't have an account yet, one will be automatically created.

Follow these steps to change the environment variables and UI settings to enable Google Login:

1. Register your instance of Redash with your Google org by visiting the [cloud console](https://console.cloud.google.com/apis/credentials). You must [create a developers project](/help/open-source/admin-guide/google-developer-account-setup/) if you have not already. Then follow the **Create Credentials** flow.
2. Set the **Authorized Redirect URL(s)** to `http(s)://${REDASH_BASEURL}/oauth/google_callback`.
3. During setup you will obtain a client id and a client secret. Use these to set the `REDASH_GOOGLE_CLIENT_ID` and `REDASH_GOOGLE_CLIENT_SECRET` environment variables.
4. Restart your Redash instance.

:::note

Step 5 below is optional. As of step 4, only visitors with an existing Redash account can sign-in using the Google Login flow. As with Password Login, visitors without an account cannot log-in unless they receive an invitation from an admin.

By following step 5, you may configure Redash to allow any user from a specified domain to log-in. An account will automatically be created for them if one does not already exist.

:::

5. Visit **Settings > General**. Complete the _Allowed Google Apps Domains_ box with the domains that should be able to log-in to your Redash instance.

## SAML 2.0

Redash can authenticate users with any IDP that supports the SAML 2.0 protocol thanks to the `pysaml` library.

### Configuring Your IDP

Your IDP will require a callback URL where users will be redirected after they authenticate. This URL will be at `/saml/callback?org_slug=<org_name>`. The organization name is `default` unless you changed it while setting up your Redash instance.

Also, you should map user fields `FirstName`, `LastName`, and `RedashGroups` (optional).

Redash uses emailAddress as its NameIDFormat.

:::note

By default any user created with SAML/SSO will join the default group. It's
possible to configure the SAML provider to pass what groups the user should join
by setting the `RedashGroups` parameter. If you use OneLogin's predefined Redash
application, it will always pass this parameter, meaning that even for existing
users, it will override their current groups memberships. Hence you need to make
sure it's up to date.

:::

### Configuring Redash

On the **Settings > General** tab you can specify whether SAML is enabled and if so whether it's _Static_ or _Dynamic_. What's the difference?

Some IDPs provide metadata URLs for configuring the SAML parameters. Okta refers to this scheme as "dynamic" configuration. We have borrowed their terminology here.

However, other IDP's do not provide this metadata URL, and the alternative is to "statically" specify an SSO URL, Entity ID, and x509 certificate on the client-side.

#### Dynamic SAML

Specific instructions for Okta, Auth0, and self-hosted SAML appear below.

Redash asks for three configuration fields:

- **SAML Metadata URL** is a URL to an XML file that contains metadata `pysaml` needs to negotiate a connection.
- **SAML Entity ID** should be the URL to your Redash instance.
- **SAML NameID Format** is the NameID Format provided by your IDP. You can usually find it in the metadata .xml file

#### Static SAML

Static configuration requires these fields:

- **SAML Single Sign-on URL** is the URL at your IDP where users will be redirected when they click the _SAML Login_ button in Redash.
- **SAML Entity ID** should be the URL to your Redash instance.
- **SAML x509 cert** will be provided by your IDP.

### Self-Hosted SAML

1. SAML Metadata URL should point to an XML file on your server, such as:
   `http://your-site.com/auth/realms/somerelm/protocol/saml/descriptor`
2. SAML Entity ID should be: `redash`
3. SAML NameID Format should be:
   `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`

### Okta

It takes just a couple of minutes to setup Redash with Okta over the SAML 2.0
protocol. Start in your Okta control panel by clicking the button to add a new
application. Choose `Web` as the platform. The sign-on method is `SAML 2.0`. On
the next screen Okta has fields for a few URLs:

- Single Sign On URL
- Recipient URL
- Destination URL
- Audience URI

You will use the same value in all of these fields. For SaaS customers, the URL
is: `https://app.redash.io/org-slug/saml/callback`

:::note

Make sure you replace `org-slug` in this URL with the unique
slug for your organization.

:::

If you are using a self-hosted version of Redash, you will need to use the URL
`https://<Your Self-Hosted Domain>/saml/callback?org_slug=default`

After you fill in these URLs, set the Name Id format to `EmailAddress`. The
Application username is `Email`. You also need to add two attribute statements
and then save your changes:

| Name      | Value          |
| --------- | -------------- |
| FirstName | user.firstName |
| LastName  | user.lastName  |

Next you will provide Okta's information to Redash. Navigate to the `Settings`
tab under the Redash settings menu. Toggle the `SAML Enabled` option. Three
fields will appear. For the `SAML Metadata URL`, look under the **Sign On** tab
of your Okta settings for a link called "Identity Provider Metadata" and paste
the link into Redash. This link will point to an XML document on Okta's server.

To get the `SAML Entity ID`, click the "View Setup Instructions" button in
Okta's **Sign On** tab. Paste the "Identity Provider Single Sign-On URL" into
Redash's `SAML Entity ID` field.

Lastly, look for the "IDP metadata" on the setup instructions page in Okta. The
"IDP metadata" is a blob of XML that contains a key called `<md:NameIDFormat>`.
Paste its contents into Redash's `SAML NameID Format` box. For example:
`urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`

Your changes on this screen will save automatically. Now you can login to Redash
using your Okta credentials.

You can now log in to Redash using Okta SSO.

#### Managing Redash Groups with Okta attribute statements

Follow the below steps in order to configure Okta so that it passes the `RedashGroups` attribute:

1. To your Okta control panel, add **RedashGroups** in SAML settings where you have previously added FirstName and LastName and then save your changes:

| Name         | Value                |
| ------------ | -------------------- |
| FirstName    | user.firstName       |
| LastName     | user.lastName        |
| RedashGroups | appuser.RedashGroups |

:::note

Name format should be left as **Basic**

:::

2. In the Admin Console, go to **Directory > Profile Editor**, and find the user profile for redash application.

3. In the Attributes screen that opens, click Add Attribute. Add a new attribute with below configuration:

| Name          | Value         |
| ------------- | ------------- |
| Data type     | string array  |
| Variable name | RedashGroups  |
| Scope         | User personal |

4. On the **Applications** page, click the **Assigments** tab. Now you can edit User Assigments and add required RedashGroups for the user.

:::note

You can also control attributes on the Okta Group level by removing the Scope from User personal.

:::

### Auth0

1. Create a traditional webapp
2. Under add-ons, enable SAML2
3. In the SAML2 config set up the callback URL:
   - For SaaS customers, the URL is:
     `https://app.redash.io/org-slug/saml/callback`
   - For Open Source users, the URL is:
     `https://[YOUR_REDASH_HOSTNAME]/saml/callback?org_slug=default`
4. In the SAML2 config use the following settings JSON:

```
{
  "mappings": {
    "given_name": "FirstName",
    "family_name": "LastName"
  },
  "passthroughClaimsWithNoMapping": false,
  "includeAttributeNameFormat": false
}
```

Within Redash, use the following config:

- SAML Metadata URL:
  `https://[YOUR_TENANT_HOSTNAME]/samlp/metadata/[CONNECTION_ID]`
- SAML Entity ID: `urn:auth0:[YOUR_TENANT_NAME]:[CONNECTION_NAME]`
- SAML NameID Format: `EmailAddress`

These changes were drawn from our
[user forum](https://discuss.redash.io/t/auth0-integration/586/5).

:::caution

Don't see your IDP here? Please consider contributing to this document by opening a Pull Request on [Github](https://github.com/getredash/website).

:::
