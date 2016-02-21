from flask import jsonify, url_for
from flask_login import login_required

from redash.authentication import current_org
from redash import settings
from redash.wsgi import app
from redash.permissions import require_super_admin
from redash.monitor import get_status


def org_scoped_rule(rule):
    if settings.MULTI_ORG:
        return "/<org_slug:org_slug>{}".format(rule)

    return rule


def base_href():
    if settings.MULTI_ORG:
        base_href = url_for('index', _external=True, org_slug=current_org.slug)
    else:
        base_href = url_for('index', _external=True)

    return base_href


@app.route('/ping', methods=['GET'])
def ping():
    return 'PONG.'


@app.route('/status.json')
@login_required
@require_super_admin
def status_api():
    status = get_status()

    return jsonify(status)


from redash.handlers import alerts, authentication, base, dashboards, data_sources, events, queries, query_results, \
    static, users, visualizations, widgets, embed, groups
