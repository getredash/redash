import json
import os
import urlparse

from funcy import distinct, remove


def parse_db_url(url):
    url_parts = urlparse.urlparse(url)
    connection = {'threadlocals': True}

    if url_parts.hostname and not url_parts.path:
        connection['name'] = url_parts.hostname
    else:
        connection['name'] = url_parts.path[1:]
        connection['host'] = url_parts.hostname
        connection['port'] = url_parts.port
        connection['user'] = url_parts.username
        connection['password'] = url_parts.password

    return connection


def fix_assets_path(path):
    fullpath = os.path.join(os.path.dirname(__file__), path)
    return fullpath


def array_from_string(str):
    array = str.split(',')
    if "" in array:
        array.remove("")

    return array


def set_from_string(str):
    return set(array_from_string(str))


def parse_boolean(str):
    return json.loads(str.lower())


def all_settings():
    from types import ModuleType

    settings = {}
    for name, item in globals().iteritems():
        if not callable(item) and not name.startswith("__") and not isinstance(item, ModuleType):
            settings[name] = item

    return settings


NAME = os.environ.get('REDASH_NAME', 'Redash')
LOGO_URL = os.environ.get('REDASH_LOGO_URL', '/images/redash_icon_small.png')

REDIS_URL = os.environ.get('REDASH_REDIS_URL', os.environ.get('REDIS_URL', "redis://localhost:6379/0"))
PROXIES_COUNT = int(os.environ.get('REDASH_PROXIES_COUNT', "1"))

STATSD_HOST = os.environ.get('REDASH_STATSD_HOST', "127.0.0.1")
STATSD_PORT = int(os.environ.get('REDASH_STATSD_PORT', "8125"))
STATSD_PREFIX = os.environ.get('REDASH_STATSD_PREFIX', "redash")
STATSD_USE_TAGS = parse_boolean(os.environ.get('REDASH_STATSD_USE_TAGS', "false"))

# Connection settings for Redash's own database (where we store the queries, results, etc)
SQLALCHEMY_DATABASE_URI = os.environ.get("REDASH_DATABASE_URL", os.environ.get('DATABASE_URL', "postgresql:///postgres"))
SQLALCHEMY_TRACK_MODIFICATIONS = False
SQLALCHEMY_ECHO = False

# Celery related settings
CELERY_BROKER = os.environ.get("REDASH_CELERY_BROKER", REDIS_URL)
CELERY_BACKEND = os.environ.get("REDASH_CELERY_BACKEND", CELERY_BROKER)
CELERY_TASK_RESULT_EXPIRES = int(os.environ.get('REDASH_CELERY_TASK_RESULT_EXPIRES', 3600))

# The following enables periodic job (every 5 minutes) of removing unused query results.
QUERY_RESULTS_CLEANUP_ENABLED = parse_boolean(os.environ.get("REDASH_QUERY_RESULTS_CLEANUP_ENABLED", "true"))
QUERY_RESULTS_CLEANUP_COUNT = int(os.environ.get("REDASH_QUERY_RESULTS_CLEANUP_COUNT", "100"))
QUERY_RESULTS_CLEANUP_MAX_AGE = int(os.environ.get("REDASH_QUERY_RESULTS_CLEANUP_MAX_AGE", "7"))

SCHEMAS_REFRESH_SCHEDULE = int(os.environ.get("REDASH_SCHEMAS_REFRESH_SCHEDULE", 30))

AUTH_TYPE = os.environ.get("REDASH_AUTH_TYPE", "api_key")
PASSWORD_LOGIN_ENABLED = parse_boolean(os.environ.get("REDASH_PASSWORD_LOGIN_ENABLED", "true"))
ENFORCE_HTTPS = parse_boolean(os.environ.get("REDASH_ENFORCE_HTTPS", "false"))

MULTI_ORG = parse_boolean(os.environ.get("REDASH_MULTI_ORG", "false"))

GOOGLE_CLIENT_ID = os.environ.get("REDASH_GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("REDASH_GOOGLE_CLIENT_SECRET", "")
GOOGLE_OAUTH_ENABLED = GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

SAML_ENTITY_ID = os.environ.get("REDASH_SAML_ENTITY_ID", "")
SAML_METADATA_URL = os.environ.get("REDASH_SAML_METADATA_URL", "")
SAML_LOCAL_METADATA_PATH = os.environ.get("REDASH_SAML_LOCAL_METADATA_PATH", "")
SAML_LOGIN_ENABLED = SAML_METADATA_URL != "" or SAML_LOCAL_METADATA_PATH != ""
SAML_NAMEID_FORMAT = os.environ.get("REDASH_SAML_NAMEID_FORMAT", "")
SAML_CALLBACK_SERVER_NAME = os.environ.get("REDASH_SAML_CALLBACK_SERVER_NAME", "")

# Enables the use of an externally-provided and trusted remote user via an HTTP
# header.  The "user" must be an email address.
#
# By default the trusted header is X-Forwarded-Remote-User.  You can change
# this by setting REDASH_REMOTE_USER_HEADER.
#
# Enabling this authentication method is *potentially dangerous*, and it is
# your responsibility to ensure that only a trusted frontend (usually on the
# same server) can talk to the redash backend server, otherwise people will be
# able to login as anyone they want by directly talking to the redash backend.
# You must *also* ensure that any special header in the original request is
# removed or always overwritten by your frontend, otherwise your frontend may
# pass it through to the backend unchanged.
#
# Note that redash will only check the remote user once, upon the first need
# for a login, and then set a cookie which keeps the user logged in.  Dropping
# the remote user header after subsequent requests won't automatically log the
# user out.  Doing so could be done with further work, but usually it's
# unnecessary.
#
# If you also set REDASH_PASSWORD_LOGIN_ENABLED to false, then your
# authentication will be seamless.  Otherwise a link will be presented on the
# login page to trigger remote user auth.
REMOTE_USER_LOGIN_ENABLED = parse_boolean(os.environ.get("REDASH_REMOTE_USER_LOGIN_ENABLED", "false"))
REMOTE_USER_HEADER = os.environ.get("REDASH_REMOTE_USER_HEADER", "X-Forwarded-Remote-User")

# Usually it will be a single path, but we allow to specify additional ones to override the default assets. Only the
# last one will be used for Flask templates.
STATIC_ASSETS_PATHS = [fix_assets_path(path) for path in os.environ.get("REDASH_STATIC_ASSETS_PATH", "../client/dist/").split(',')]
STATIC_ASSETS_PATHS.append(fix_assets_path('./static/'))

JOB_EXPIRY_TIME = int(os.environ.get("REDASH_JOB_EXPIRY_TIME", 3600 * 6))
COOKIE_SECRET = os.environ.get("REDASH_COOKIE_SECRET", "c292a0a3aa32397cdb050e233733900f")
SESSION_COOKIE_SECURE = parse_boolean(os.environ.get("REDASH_SESSION_COOKIE_SECURE") or str(ENFORCE_HTTPS))

LOG_LEVEL = os.environ.get("REDASH_LOG_LEVEL", "INFO")

# Mail settings:
MAIL_SERVER = os.environ.get('REDASH_MAIL_SERVER', 'localhost')
MAIL_PORT = int(os.environ.get('REDASH_MAIL_PORT', 25))
MAIL_USE_TLS = parse_boolean(os.environ.get('REDASH_MAIL_USE_TLS', 'false'))
MAIL_USE_SSL = parse_boolean(os.environ.get('REDASH_MAIL_USE_SSL', 'false'))
MAIL_USERNAME = os.environ.get('REDASH_MAIL_USERNAME', None)
MAIL_PASSWORD = os.environ.get('REDASH_MAIL_PASSWORD', None)
MAIL_DEFAULT_SENDER = os.environ.get('REDASH_MAIL_DEFAULT_SENDER', None)
MAIL_MAX_EMAILS = os.environ.get('REDASH_MAIL_MAX_EMAILS', None)
MAIL_ASCII_ATTACHMENTS = parse_boolean(os.environ.get('REDASH_MAIL_ASCII_ATTACHMENTS', 'false'))

HOST = os.environ.get('REDASH_HOST', '')

ALERTS_DEFAULT_MAIL_SUBJECT_TEMPLATE = os.environ.get('REDASH_ALERTS_DEFAULT_MAIL_SUBJECT_TEMPLATE', "({state}) {alert_name}")

# How many requests are allowed per IP to the login page before
# being throttled?
# See https://flask-limiter.readthedocs.io/en/stable/#rate-limit-string-notation
THROTTLE_LOGIN_PATTERN = os.environ.get('REDASH_THROTTLE_LOGIN_PATTERN', '50/hour')

# CORS settings for the Query Result API (and possbily future external APIs).
# In most cases all you need to do is set REDASH_CORS_ACCESS_CONTROL_ALLOW_ORIGIN
# to the calling domain (or domains in a comma separated list).
ACCESS_CONTROL_ALLOW_ORIGIN = set_from_string(os.environ.get("REDASH_CORS_ACCESS_CONTROL_ALLOW_ORIGIN", ""))
ACCESS_CONTROL_ALLOW_CREDENTIALS = parse_boolean(os.environ.get("REDASH_CORS_ACCESS_CONTROL_ALLOW_CREDENTIALS", "false"))
ACCESS_CONTROL_REQUEST_METHOD = os.environ.get("REDASH_CORS_ACCESS_CONTROL_REQUEST_METHOD", "GET, POST, PUT")
ACCESS_CONTROL_ALLOW_HEADERS = os.environ.get("REDASH_CORS_ACCESS_CONTROL_ALLOW_HEADERS", "Content-Type")

# Query Runners
default_query_runners = [
    'redash.query_runner.big_query',
    'redash.query_runner.google_spreadsheets',
    'redash.query_runner.graphite',
    'redash.query_runner.mongodb',
    'redash.query_runner.mysql',
    'redash.query_runner.pg',
    'redash.query_runner.url',
    'redash.query_runner.influx_db',
    'redash.query_runner.elasticsearch',
    'redash.query_runner.presto',
    'redash.query_runner.hive_ds',
    'redash.query_runner.impala_ds',
    'redash.query_runner.vertica',
    'redash.query_runner.clickhouse',
    'redash.query_runner.treasuredata',
    'redash.query_runner.sqlite',
    'redash.query_runner.dynamodb_sql',
    'redash.query_runner.mssql',
    'redash.query_runner.jql',
    'redash.query_runner.google_analytics',
    'redash.query_runner.snowflake'
]

enabled_query_runners = array_from_string(os.environ.get("REDASH_ENABLED_QUERY_RUNNERS", ",".join(default_query_runners)))
additional_query_runners = array_from_string(os.environ.get("REDASH_ADDITIONAL_QUERY_RUNNERS", ""))
disabled_query_runners = array_from_string(os.environ.get("REDASH_DISABLED_QUERY_RUNNERS", ""))

QUERY_RUNNERS = remove(set(disabled_query_runners), distinct(enabled_query_runners + additional_query_runners))

# Destinations
default_destinations = [
    'redash.destinations.email',
    'redash.destinations.slack',
    'redash.destinations.webhook',
    'redash.destinations.hipchat',
]

enabled_destinations = array_from_string(os.environ.get("REDASH_ENABLED_DESTINATIONS", ",".join(default_destinations)))
additional_destinations = array_from_string(os.environ.get("REDASH_ADDITIONAL_DESTINATIONS", ""))

DESTINATIONS = distinct(enabled_destinations + additional_destinations)

EVENT_REPORTING_WEBHOOKS = array_from_string(os.environ.get("REDASH_EVENT_REPORTING_WEBHOOKS", ""))

# Support for Sentry (http://getsentry.com/). Just set your Sentry DSN to enable it:
SENTRY_DSN = os.environ.get("REDASH_SENTRY_DSN", "")

# Client side toggles:
ALLOW_SCRIPTS_IN_USER_INPUT = parse_boolean(os.environ.get("REDASH_ALLOW_SCRIPTS_IN_USER_INPUT", "false"))
DATE_FORMAT = os.environ.get("REDASH_DATE_FORMAT", "DD/MM/YY")

# Features:
FEATURE_ALLOW_ALL_TO_EDIT_QUERIES = parse_boolean(os.environ.get("REDASH_FEATURE_ALLOW_ALL_TO_EDIT", "true"))
VERSION_CHECK = parse_boolean(os.environ.get("REDASH_VERSION_CHECK", "true"))
FEATURE_DISABLE_REFRESH_QUERIES = parse_boolean(os.environ.get("REDASH_FEATURE_DISABLE_REFRESH_QUERIES", "false"))
FEATURE_SHOW_QUERY_RESULTS_COUNT = parse_boolean(os.environ.get("REDASH_FEATURE_SHOW_QUERY_RESULTS_COUNT", "true"))
FEATURE_SHOW_PERMISSIONS_CONTROL = parse_boolean(os.environ.get("REDASH_FEATURE_SHOW_PERMISSIONS_CONTROL", "false"))
FEATURE_ALLOW_CUSTOM_JS_VISUALIZATIONS = parse_boolean(os.environ.get("REDASH_FEATURE_ALLOW_CUSTOM_JS_VISUALIZATIONS",
                                                                     "false"))

# BigQuery
BIGQUERY_HTTP_TIMEOUT = int(os.environ.get("REDASH_BIGQUERY_HTTP_TIMEOUT", "600"))

# Enhance schema fetching
SCHEMA_RUN_TABLE_SIZE_CALCULATIONS = parse_boolean(os.environ.get("REDASH_SCHEMA_RUN_TABLE_SIZE_CALCULATIONS", "false"))

# Allow Parameters in Embeds
# WARNING: With this option enabled, Redash reads query parameters from the request URL (risk of SQL injection!)
ALLOW_PARAMETERS_IN_EMBEDS = parse_boolean(os.environ.get("REDASH_ALLOW_PARAMETERS_IN_EMBEDS", "false"))

# Common Client config
COMMON_CLIENT_CONFIG = {
    'allowScriptsInUserInput': ALLOW_SCRIPTS_IN_USER_INPUT,
    'showPermissionsControl': FEATURE_SHOW_PERMISSIONS_CONTROL,
    'allowCustomJSVisualizations': FEATURE_ALLOW_CUSTOM_JS_VISUALIZATIONS,
    'dateFormat': DATE_FORMAT,
    'dateTimeFormat': "{0} HH:mm".format(DATE_FORMAT),
    'allowAllToEditQueries': FEATURE_ALLOW_ALL_TO_EDIT_QUERIES,
    'mailSettingsMissing': MAIL_DEFAULT_SENDER is None,
    'logoUrl': LOGO_URL
}
