"""
This module implements different strategies to resolve the current Organization we are using. By default we use the simple
single_org strategy, which assumes you have a single Organization in your installation.
"""

import logging
from redash import settings
from redash.models import Organization
from werkzeug.local import LocalProxy
from flask import request


def single_org(request):
    return Organization.select().first()


def multi_org(request):
    return Organization.get_by_domain(request.host)


def _get_current_org():
    org = globals()[settings.ORG_RESOLVING](request)
    logging.debug("Current organization: %s (resolved with: %s)", org, settings.ORG_RESOLVING)
    return org


current_org = LocalProxy(_get_current_org)


