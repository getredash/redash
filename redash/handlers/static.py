import hashlib
import json

from flask import render_template, send_from_directory, current_app, url_for, request
from flask_login import current_user, login_required

from redash import settings, __version__
from redash.handlers import org_scoped_rule
from redash.wsgi import app
from redash.version_check import get_latest_version
from redash.authentication.org_resolving import current_org



@app.route('/<path:filename>')
def send_static(filename):
    if current_app.debug:
        cache_timeout = 0
    else:
        cache_timeout = None

    return send_from_directory(settings.STATIC_ASSETS_PATH, filename, cache_timeout=cache_timeout)


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

    if settings.MULTI_ORG:
        base_href = url_for('index', _external=True, org_slug=current_org.slug)
    else:
        base_href = url_for('index', _external=True)

    response = render_template("index.html",
                               user=json.dumps(user),
                               base_href=base_href,
                               name=settings.NAME,
                               org_slug=current_org.slug,
                               client_config=json.dumps(client_config),
                               analytics=settings.ANALYTICS)

    return response, 200, headers


def register_static_routes(rules):
    # Make sure that / is the first route considered as index.
    app.add_url_rule(org_scoped_rule("/"), "index", index)

    for rule in rules:
        app.add_url_rule(org_scoped_rule(rule), None, index)

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
          '/groups',
          '/groups/<pk>',
          '/groups/<pk>/data_sources',
          '/queries/<query_id>',
          '/queries/<query_id>/<anything>',
          '/personal']

register_static_routes(rules)
