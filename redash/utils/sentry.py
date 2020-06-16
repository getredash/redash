import sentry_sdk
from redash import __version__, settings
from sentry_sdk.integrations.celery import CeleryIntegration
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

NON_REPORTED_EXCEPTIONS = ["QueryExecutionError"]


def before_send(event, hint):
    if "exc_info" in hint:
        exc_type, exc_value, tb = hint["exc_info"]
        if any([(e in str(type(exc_value))) for e in NON_REPORTED_EXCEPTIONS]):
            return None

    return event


def init():
    if settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            release=__version__,
            before_send=before_send,
            send_default_pii=True,
            integrations=[
                FlaskIntegration(),
                CeleryIntegration(),
                SqlalchemyIntegration(),
                RedisIntegration(),
            ],
        )
