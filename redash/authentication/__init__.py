from flask_login import LoginManager, user_logged_in
import hashlib
import hmac
import time
import logging

from flask import redirect, request, jsonify

from redash import models, settings
from redash.authentication import google_oauth, saml_auth
from redash.authentication.org_resolving import current_org
from redash.authentication.helper import get_login_url
from redash.tasks import record_event

login_manager = LoginManager()
logger = logging.getLogger('authentication')


def sign(key, path, expires):
    if not key:
        return None

    h = hmac.new(str(key), msg=path, digestmod=hashlib.sha1)
    h.update(str(expires))

    return h.hexdigest()


@login_manager.user_loader
def load_user(user_id):
    try:
        return models.User.get_by_id_and_org(user_id, current_org.id)
    except models.User.DoesNotExist:
        return None


def hmac_load_user_from_request(request):
    signature = request.args.get('signature')
    expires = float(request.args.get('expires') or 0)
    query_id = request.view_args.get('query_id', None)
    user_id = request.args.get('user_id', None)

    # TODO: 3600 should be a setting
    if signature and time.time() < expires <= time.time() + 3600:
        if user_id:
            user = models.User.get_by_id(user_id)
            calculated_signature = sign(user.api_key, request.path, expires)

            if user.api_key and signature == calculated_signature:
                return user

        if query_id:
            query = models.Query.get(models.Query.id == query_id)
            calculated_signature = sign(query.api_key, request.path, expires)

            if query.api_key and signature == calculated_signature:
                return models.ApiUser(query.api_key, query.org, query.groups.keys())

    return None


def get_user_from_api_key(api_key, query_id):
    if not api_key:
        return None

    user = None

    try:
        user = models.User.get_by_api_key_and_org(api_key, current_org.id)
    except models.User.DoesNotExist:
        if query_id:
            query = models.Query.get_by_id_and_org(query_id, current_org.id)
            if query and query.api_key == api_key:
                user = models.ApiUser(api_key, query.org, query.groups.keys())

    return user


def get_api_key_from_request(request):
    api_key = request.args.get('api_key', None)

    if api_key is None and request.headers.get('Authorization'):
        auth_header = request.headers.get('Authorization')
        api_key = auth_header.replace('Key ', '', 1)

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

    user_logged_in.connect(log_user_logged_in)

    if settings.AUTH_TYPE == 'hmac':
        login_manager.request_loader(hmac_load_user_from_request)
    elif settings.AUTH_TYPE == 'api_key':
        login_manager.request_loader(api_key_load_user_from_request)
    else:
        logger.warning("Unknown authentication type ({}). Using default (HMAC).".format(settings.AUTH_TYPE))
        login_manager.request_loader(hmac_load_user_from_request)
