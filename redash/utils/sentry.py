import os

import sentry_sdk
from funcy import iffy
from sentry_sdk.integrations.flask import FlaskIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.rq import RqIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from redash import __version__, settings

TRACES_SAMPLE_RATE = float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.0"))

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
            environment=settings.SENTRY_ENVIRONMENT,
            release=__version__,
            before_send=before_send,
            send_default_pii=True,
            integrations=[
                FlaskIntegration(),
                SqlalchemyIntegration(),
                RedisIntegration(),
                RqIntegration(),
            ],
            traces_sample_rate=TRACES_SAMPLE_RATE,
        )


capture_exception = iffy(lambda _: settings.SENTRY_DSN, sentry_sdk.capture_exception)
