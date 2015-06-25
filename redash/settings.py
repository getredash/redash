import json
import os
import urlparse


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


def parse_boolean(str):
    return json.loads(str.lower())


NAME = os.environ.get('REDASH_NAME', 're:dash')

REDIS_URL = os.environ.get('REDASH_REDIS_URL', "redis://localhost:6379/0")

STATSD_HOST = os.environ.get('REDASH_STATSD_HOST', "127.0.0.1")
STATSD_PORT = int(os.environ.get('REDASH_STATSD_PORT', "8125"))
STATSD_PREFIX = os.environ.get('REDASH_STATSD_PREFIX', "redash")

# Connection settings for re:dash's own database (where we store the queries, results, etc)
DATABASE_CONFIG = parse_db_url(os.environ.get("REDASH_DATABASE_URL", "postgresql://postgres"))

# Celery related settings
CELERY_BROKER = os.environ.get("REDASH_CELERY_BROKER", REDIS_URL)
CELERY_BACKEND = os.environ.get("REDASH_CELERY_BACKEND", REDIS_URL)

# The following enables periodic job (every 5 minutes) of removing unused query results. Behind this "feature flag" until
# proved to be "safe".
QUERY_RESULTS_CLEANUP_ENABLED = parse_boolean(os.environ.get("REDASH_QUERY_RESULTS_CLEANUP_ENABLED", "false"))

AUTH_TYPE = os.environ.get("REDASH_AUTH_TYPE", "hmac")
PASSWORD_LOGIN_ENABLED = parse_boolean(os.environ.get("REDASH_PASSWORD_LOGIN_ENABLED", "true"))

# Google Apps domain to allow access from; any user with email in this Google Apps will be allowed
# access
GOOGLE_APPS_DOMAIN = os.environ.get("REDASH_GOOGLE_APPS_DOMAIN", "")

GOOGLE_CLIENT_ID = os.environ.get("REDASH_GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("REDASH_GOOGLE_CLIENT_SECRET", "")
GOOGLE_OAUTH_ENABLED = GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET

SAML_METADATA_URL = os.environ.get("REDASH_SAML_METADATA_URL", "")
SAML_LOGIN_ENABLED = SAML_METADATA_URL != ""

STATIC_ASSETS_PATH = fix_assets_path(os.environ.get("REDASH_STATIC_ASSETS_PATH", "../rd_ui/app/"))
JOB_EXPIRY_TIME = int(os.environ.get("REDASH_JOB_EXPIRY_TIME", 3600 * 6))
COOKIE_SECRET = os.environ.get("REDASH_COOKIE_SECRET", "c292a0a3aa32397cdb050e233733900f")
LOG_LEVEL = os.environ.get("REDASH_LOG_LEVEL", "INFO")
CLIENT_SIDE_METRICS = parse_boolean(os.environ.get("REDASH_CLIENT_SIDE_METRICS", "false"))
ANALYTICS = os.environ.get("REDASH_ANALYTICS", "")

# Query Runners
QUERY_RUNNERS = array_from_string(os.environ.get("REDASH_ENABLED_QUERY_RUNNERS", ",".join([
    'redash.query_runner.big_query',
    'redash.query_runner.graphite',
    'redash.query_runner.mongodb',
    'redash.query_runner.mysql',
    'redash.query_runner.pg',
    'redash.query_runner.script',
    'redash.query_runner.url',
])))

# Features:
FEATURE_TABLES_PERMISSIONS = parse_boolean(os.environ.get("REDASH_FEATURE_TABLES_PERMISSIONS", "false"))
