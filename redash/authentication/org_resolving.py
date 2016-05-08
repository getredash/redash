"""
This module implements different strategies to resolve the current Organization we are using.

By default we use the simple single_org strategy, which assumes you have a
single Organization in your installation.
"""

import logging

from flask import request, g
from werkzeug.local import LocalProxy

from redash.models import Organization


def _get_current_org():
    slug = request.view_args.get('org_slug', g.get('org_slug', 'default'))
    org = Organization.get_by_slug(slug)
    logging.debug("Current organization: %s (slug: %s)", org, slug)
    return org

# TODO: move to authentication
current_org = LocalProxy(_get_current_org)
