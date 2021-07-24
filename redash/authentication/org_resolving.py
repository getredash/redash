import logging

from flask import g, request
from werkzeug.local import LocalProxy

from redash.models import Organization


def _get_current_org():
    if "org" in g:
        return g.org

    if request.view_args is None:
        slug = g.get("org_slug", "default")
    else:
        slug = request.view_args.get("org_slug", g.get("org_slug", "default"))

    g.org = Organization.get_by_slug(slug)
    logging.debug("Current organization: %s (slug: %s)", g.org, slug)
    return g.org


# TODO: move to authentication
current_org = LocalProxy(_get_current_org)
