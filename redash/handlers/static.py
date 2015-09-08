import hashlib
import json

from flask import render_template, send_from_directory, current_app
from flask_login import current_user, login_required

from redash import settings
from redash.wsgi import app


@app.route('/admin/<anything>/<whatever>')
@app.route('/admin/<anything>')
@app.route('/dashboard/<anything>')
@app.route('/alerts')
@app.route('/alerts/<pk>')
@app.route('/queries')
@app.route('/data_sources')
@app.route('/data_sources/<pk>')
@app.route('/users')
@app.route('/users/<pk>')
@app.route('/queries/<query_id>')
@app.route('/queries/<query_id>/<anything>')
@app.route('/personal')
@app.route('/')
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

    features = {
        'clientSideMetrics': settings.CLIENT_SIDE_METRICS,
        'allowScriptsInUserInput': settings.ALLOW_SCRIPTS_IN_USER_INPUT
    }

    return render_template("index.html", user=json.dumps(user), name=settings.NAME,
                           features=json.dumps(features),
                           analytics=settings.ANALYTICS)


@app.route('/<path:filename>')
def send_static(filename):
    if current_app.debug:
        cache_timeout = 0
    else:
        cache_timeout = None

    return send_from_directory(settings.STATIC_ASSETS_PATH, filename, cache_timeout=cache_timeout)
