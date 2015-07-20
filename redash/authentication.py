import hashlib
import hmac
import time
import logging

from flask.ext.login import LoginManager
from flask.ext.login import user_logged_in

from redash import models, settings, google_oauth, saml_auth
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
    return models.User.get_by_id(user_id)


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
                return models.ApiUser(query.api_key)

    return None

def get_user_from_api_key(api_key, query_id):
    if not api_key:
        return None

    user = None
    try:
        user = models.User.get_by_api_key(api_key)
    except models.User.DoesNotExist:
        if query_id:
            query = models.Query.get_by_id(query_id)
            if query and query.api_key == api_key:
                user = models.ApiUser(api_key)

    return user

def api_key_load_user_from_request(request):
    api_key = request.args.get('api_key', None)
    query_id = request.view_args.get('query_id', None)

    user = get_user_from_api_key(api_key, query_id)
    return user


def log_user_logged_in(app, user):
    event = {
        'user_id': user.id,
        'action': 'login',
        'object_type': 'redash',
        'timestamp': int(time.time()),
    }

    record_event.delay(event)


def setup_authentication(app):
    login_manager.init_app(app)
    login_manager.anonymous_user = models.AnonymousUser
    login_manager.login_view = 'login'
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


