from redash import settings
from redash.authentication.org_resolving import current_org
from flask import url_for, request


# TODO: move this back to authentication/__init__.py after resolving circular depdency between redash.wsgi and redash.handler
def get_login_url(external=False, next="/"):
    if settings.MULTI_ORG:
        login_url = url_for('login', org_slug=current_org.slug, next=next, _external=external)
    else:
        login_url = url_for('login', next=next, _external=external)

    return login_url
