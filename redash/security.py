import functools

from flask import request, session
from flask_login import current_user
from flask_talisman import talisman
from flask_wtf.csrf import CSRFProtect, generate_csrf

from redash import settings

talisman = talisman.Talisman()
csrf = CSRFProtect()


def csp_allows_embeding(fn):
    @functools.wraps(fn)
    def decorated(*args, **kwargs):
        return fn(*args, **kwargs)

    embedable_csp = talisman.content_security_policy + "frame-ancestors *;"
    return talisman(content_security_policy=embedable_csp, frame_options=None)(decorated)


def init_app(app):
    csrf.init_app(app)
    app.config["WTF_CSRF_CHECK_DEFAULT"] = False
    app.config["WTF_CSRF_SSL_STRICT"] = False
    app.config["WTF_CSRF_TIME_LIMIT"] = settings.CSRF_TIME_LIMIT

    @app.after_request
    def inject_csrf_token(response):
        response.set_cookie("csrf_token", generate_csrf())
        return response

    if settings.ENFORCE_CSRF:

        @app.before_request
        def check_csrf():
            # BEGIN workaround until https://github.com/lepture/flask-wtf/pull/419 is merged
            if request.blueprint in csrf._exempt_blueprints:
                return

            view = app.view_functions.get(request.endpoint)
            if view is not None and f"{view.__module__}.{view.__name__}" in csrf._exempt_views:
                return
            # END workaround

            if not current_user.is_authenticated or "user_id" in session:
                csrf.protect()

    talisman.init_app(
        app,
        feature_policy=settings.FEATURE_POLICY,
        force_https=settings.ENFORCE_HTTPS,
        force_https_permanent=settings.ENFORCE_HTTPS_PERMANENT,
        force_file_save=settings.ENFORCE_FILE_SAVE,
        frame_options=settings.FRAME_OPTIONS,
        frame_options_allow_from=settings.FRAME_OPTIONS_ALLOW_FROM,
        strict_transport_security=settings.HSTS_ENABLED,
        strict_transport_security_preload=settings.HSTS_PRELOAD,
        strict_transport_security_max_age=settings.HSTS_MAX_AGE,
        strict_transport_security_include_subdomains=settings.HSTS_INCLUDE_SUBDOMAINS,
        content_security_policy=settings.CONTENT_SECURITY_POLICY,
        content_security_policy_report_uri=settings.CONTENT_SECURITY_POLICY_REPORT_URI,
        content_security_policy_report_only=settings.CONTENT_SECURITY_POLICY_REPORT_ONLY,
        content_security_policy_nonce_in=settings.CONTENT_SECURITY_POLICY_NONCE_IN,
        referrer_policy=settings.REFERRER_POLICY,
        session_cookie_secure=settings.SESSION_COOKIE_SECURE,
        session_cookie_http_only=settings.SESSION_COOKIE_HTTPONLY,
    )
