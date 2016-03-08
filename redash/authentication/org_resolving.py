"""
This module implements different strategies to resolve the current Organization we are using.

By default we use the simple single_org strategy, which assumes you have a
single Organization in your installation.
"""

import logging
from redash.models import Organization
from werkzeug.local import LocalProxy
from flask import request


def _get_current_org():
    slug = request.view_args.get('org_slug', 'default')
    org = Organization.get_by_slug(slug)
    logging.debug("Current organization: %s (slug: %s)", org, slug)
    return org


# TODO: move to authentication
current_org = LocalProxy(_get_current_org)
