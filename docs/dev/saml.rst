SAML Authentication and Authorization
#####################################

Authentication
==============

Add to your .env file REDASH_SAML_METADATA_URL config value which
needs to point to the SAML provider metadata url, eg https://app.onelogin.com/saml/metadata/

And an optional REDASH_SAML_CALLBACK_SERVER_NAME which contains the
 server name of the redash server for the callbacks from the SAML provider (eg demo.redash.io)

If you want to specify entityid in AuthnRequest,
add REDASH_SAML_ENTITY_ID config value, eg http://demo.redash.io/saml/callback

On the SAML provider side, example configuration for OneLogin is:
SAML Consumer URL: http://demo.redash.io/saml/login
SAML Audience: http://demo.redash.io/saml/callback
SAML Recipient: http://demo.redash.io/saml/callback

Example configuration for Okta is:
Single Sign On URL: http://demo.redash.io/saml/callback
Recipient URL: http://demo.redash.io/saml/callback
Destination URL: http://demo.redash.io/saml/callback

with parameters 'FirstName' and 'LastName', both configured to be included in the SAML assertion.


Authorization
=============
To manage group assignments in Redash using your SAML provider, configure SAML response to include
attribute with key 'RedashGroups', and value as names of groups in Redash.

Example configuration for Okta is:
In the Group Attribute Statements -
Name: RedashGroups
Filter: Starts with: this-is-a-group-in-redash