import functools
from flask_talisman import talisman

from redash import settings


talisman = talisman.Talisman()


def csp_allows_embeding(fn):
    @functools.wraps(fn)
    def decorated(*args, **kwargs):
        return fn(*args, **kwargs)

    embedable_csp = talisman.content_security_policy + "frame-ancestors *;"
    return talisman(content_security_policy=embedable_csp, frame_options=None)(
        decorated
    )


def init_app(app):
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
