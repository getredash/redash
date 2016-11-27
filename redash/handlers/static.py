import os

from flask import current_app, safe_join, send_file
from flask_login import login_required
from redash import settings
from redash.handlers import routes
from redash.handlers.base import org_scoped_rule
from werkzeug.exceptions import NotFound


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
    full_path = safe_join(settings.STATIC_ASSETS_PATHS[-2], 'index.html')
    return send_file(full_path, **dict(cache_timeout=0, conditional=True))


def register_static_routes(rules):
    # Make sure that / is the first route considered as index.
    routes.add_url_rule(org_scoped_rule("/"), "index", index)

    for rule in rules:
        routes.add_url_rule(org_scoped_rule(rule), None, index)

rules = ['/admin/<anything>/<whatever>',
         '/admin/<anything>',
         '/dashboards',
         '/dashboard/<anything>',
         '/dashboards/<anything>',
         '/alerts',
         '/alerts/<pk>',
         '/queries',
         '/data_sources',
         '/data_sources/<pk>',
         '/users',
         '/users/<pk>',
         '/destinations',
         '/destinations/<pk>',
         '/query_snippets',
         '/query_snippets/<pk>',
         '/groups',
         '/groups/<pk>',
         '/groups/<pk>/data_sources',
         '/queries/<query_id>',
         '/queries/<query_id>/<anything>',
         '/personal']

register_static_routes(rules)
