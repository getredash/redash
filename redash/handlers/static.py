import os
import hashlib
import json

from flask import render_template, safe_join, send_file, current_app
from flask_login import current_user, login_required
from werkzeug.exceptions import NotFound

from redash import settings, __version__
from redash.handlers import routes
from redash.handlers.base import org_scoped_rule
from redash.version_check import get_latest_version
from authentication import current_org


@routes.route('/<path:filename>')
def send_static(filename):
    if current_app.debug:
        cache_timeout = 0
    else:
        cache_timeout = None

    # The following is copied from send_from_directory, and extended to support multiple directories
    for path in settings.STATIC_ASSETS_PATHS:
        full_path = safe_join(path, filename)
        if os.path.isfile(full_path):
            return send_file(full_path, **dict(cache_timeout=cache_timeout, conditional=True))

    raise NotFound()


@login_required
def index(**kwargs):
    email_md5 = hashlib.md5(current_user.email.lower()).hexdigest()
    gravatar_url = "https://www.gravatar.com/avatar/%s?s=40" % email_md5

    user = {
        'gravatar_url': gravatar_url,
        'id': current_user.id,
        'name': current_user.name,
        'email': current_user.email,
        'groups': current_user.groups,
        'permissions': current_user.permissions
    }

    client_config = {
        'newVersionAvailable': get_latest_version(),
        'version': __version__
    }

    client_config.update(settings.COMMON_CLIENT_CONFIG)

    headers = {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate'
    }

    response = render_template("index.html",
                               user=json.dumps(user),
                               org_slug=current_org.slug,
                               client_config=json.dumps(client_config))

    return response, 200, headers


def register_static_routes(rules):
    # Make sure that / is the first route considered as index.
    routes.add_url_rule(org_scoped_rule("/"), "index", index)

    for rule in rules:
        routes.add_url_rule(org_scoped_rule(rule), None, index)

rules = ['/admin/<anything>/<whatever>',
          '/admin/<anything>',
          '/dashboard/<anything>',
          '/alerts',
          '/alerts/<pk>',
          '/queries',
          '/data_sources',
          '/data_sources/<pk>',
          '/users',
          '/users/<pk>',
          '/destinations',
          '/destinations/<pk>',
          '/groups',
          '/groups/<pk>',
          '/groups/<pk>/data_sources',
          '/queries/<query_id>',
          '/queries/<query_id>/<anything>',
          '/personal']

register_static_routes(rules)
