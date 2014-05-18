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

# The following is kept for backward compatability, and shouldn't be used any more.
CONNECTION_ADAPTER = os.environ.get("REDASH_CONNECTION_ADAPTER", "pg")
CONNECTION_STRING = os.environ.get("REDASH_CONNECTION_STRING", "user= password= host= port=5439 dbname=")

# Connection settings for re:dash's own database (where we store the queries, results, etc)
DATABASE_CONFIG = parse_db_url(os.environ.get("REDASH_DATABASE_URL", "postgresql://postgres"))

# Celery related settings
CELERY_BROKER = os.environ.get("REDASH_CELERY_BROKER", REDIS_URL)
CELERY_BACKEND = os.environ.get("REDASH_CELERY_BACKEND", REDIS_URL)

# Google Apps domain to allow access from; any user with email in this Google Apps will be allowed
# access
GOOGLE_APPS_DOMAIN = os.environ.get("REDASH_GOOGLE_APPS_DOMAIN", "")
GOOGLE_OPENID_ENABLED = parse_boolean(os.environ.get("REDASH_GOOGLE_OPENID_ENABLED", "true"))
PASSWORD_LOGIN_ENABLED = parse_boolean(os.environ.get("REDASH_PASSWORD_LOGIN_ENABLED", "false"))
ALLOWED_EXTERNAL_USERS = array_from_string(os.environ.get("REDASH_ALLOWED_EXTERNAL_USERS", ''))
STATIC_ASSETS_PATH = fix_assets_path(os.environ.get("REDASH_STATIC_ASSETS_PATH", "../rd_ui/app/"))
WORKERS_COUNT = int(os.environ.get("REDASH_WORKERS_COUNT", "2"))
JOB_EXPIRY_TIME = int(os.environ.get("REDASH_JOB_EXPIRY_TIME", 3600*24))
COOKIE_SECRET = os.environ.get("REDASH_COOKIE_SECRET", "c292a0a3aa32397cdb050e233733900f")
LOG_LEVEL = os.environ.get("REDASH_LOG_LEVEL", "INFO")
EVENTS_LOG_PATH = os.environ.get("REDASH_EVENTS_LOG_PATH", "")
EVENTS_CONSOLE_OUTPUT = parse_boolean(os.environ.get("REDASH_EVENTS_CONSOLE_OUTPUT", "false"))
CLIENT_SIDE_METRICS = parse_boolean(os.environ.get("REDASH_CLIENT_SIDE_METRICS", "false"))
ANALYTICS = os.environ.get("REDASH_ANALYTICS", "")

# Features:
FEATURE_TABLES_PERMISSIONS = parse_boolean(os.environ.get("REDASH_FEATURE_TABLES_PERMISSIONS", "false"))