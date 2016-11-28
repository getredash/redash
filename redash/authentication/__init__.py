from flask_login import LoginManager, user_logged_in
import hashlib
import hmac
import time
import logging

from flask import redirect, request, jsonify, url_for

from redash import models, settings
from redash.authentication.org_resolving import current_org
from redash.authentication import google_oauth, saml_auth, remote_user_auth
from redash.tasks import record_event

login_manager = LoginManager()
logger = logging.getLogger('authentication')


def get_login_url(external=False, next="/"):
    if settings.MULTI_ORG:
        login_url = url_for('redash.login', org_slug=current_org.slug, next=next, _external=external)
    else:
        login_url = url_for('redash.login', next=next, _external=external)

    return login_url


def sign(key, path, expires):
    if not key:
        return None

    h = hmac.new(str(key), msg=path, digestmod=hashlib.sha1)
    h.update(str(expires))

    return h.hexdigest()


@login_manager.user_loader
def load_user(user_id):
    org = current_org._get_current_object()
    try:
        return models.User.get_by_id_and_org(user_id, org)
    except models.NoResultFound:
        return None


def hmac_load_user_from_request(request):
    signature = request.args.get('signature')
    expires = float(request.args.get('expires') or 0)
    query_id = request.view_args.get('query_id', None)
    user_id = request.args.get('user_id', None)

    # TODO: 3600 should be a setting
    if signature and time.time() < expires <= time.time() + 3600:
        if user_id:
            user = models.User.query.get(user_id)
            calculated_signature = sign(user.api_key, request.path, expires)

            if user.api_key and signature == calculated_signature:
                return user

        if query_id:
            query = models.db.session.query(models.Query).filter(models.Query.id == query_id).one()
            calculated_signature = sign(query.api_key, request.path, expires)

            if query.api_key and signature == calculated_signature:
                return models.ApiUser(query.api_key, query.org, query.groups.keys(), name="ApiKey: Query {}".format(query.id))

    return None


def get_user_from_api_key(api_key, query_id):
    if not api_key:
        return None

    user = None

    # TODO: once we switch all api key storage into the ApiKey model, this code will be much simplified
    org = current_org._get_current_object()
    try:
        user = models.User.get_by_api_key_and_org(api_key, org)
    except models.NoResultFound:
        try:
            api_key = models.ApiKey.get_by_api_key(api_key)
            user = models.ApiUser(api_key, api_key.org, [])
        except models.NoResultFound:
            if query_id:
                query = models.Query.get_by_id_and_org(query_id, org)
                if query and query.api_key == api_key:
                    user = models.ApiUser(api_key, query.org, query.groups.keys(), name="ApiKey: Query {}".format(query.id))

    return user


def get_api_key_from_request(request):
    api_key = request.args.get('api_key', None)

    if api_key is None and request.headers.get('Authorization'):
        auth_header = request.headers.get('Authorization')
        api_key = auth_header.replace('Key ', '', 1)

    if api_key is None and request.view_args.get('token'):
        api_key = request.view_args['token']

    return api_key


def api_key_load_user_from_request(request):
    api_key = get_api_key_from_request(request)
    query_id = request.view_args.get('query_id', None)
    user = get_user_from_api_key(api_key, query_id)
    return user


def log_user_logged_in(app, user):
    event = {
        'org_id': current_org.id,
        'user_id': user.id,
        'action': 'login',
        'object_type': 'redash',
        'timestamp': int(time.time()),
        'user_agent': request.user_agent.string,
        'ip': request.remote_addr
    }

    record_event.delay(event)


@login_manager.unauthorized_handler
def redirect_to_login():
    if request.is_xhr or '/api/' in request.path:
        response = jsonify({'message': "Couldn't find resource. Please login and try again."})
        response.status_code = 404
        return response

    login_url = get_login_url(next=request.url, external=False)

    return redirect(login_url)


def setup_authentication(app):
    login_manager.init_app(app)
    login_manager.anonymous_user = models.AnonymousUser

    app.secret_key = settings.COOKIE_SECRET
    app.register_blueprint(google_oauth.blueprint)
    app.register_blueprint(saml_auth.blueprint)
    app.register_blueprint(remote_user_auth.blueprint)

    user_logged_in.connect(log_user_logged_in)

    if settings.AUTH_TYPE == 'hmac':
        login_manager.request_loader(hmac_load_user_from_request)
    elif settings.AUTH_TYPE == 'api_key':
        login_manager.request_loader(api_key_load_user_from_request)
    else:
        logger.warning("Unknown authentication type ({}). Using default (HMAC).".format(settings.AUTH_TYPE))
        login_manager.request_loader(hmac_load_user_from_request)


