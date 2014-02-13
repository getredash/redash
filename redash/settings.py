import os
import urlparse


def parse_db_url(url):
    url_parts = urlparse.urlparse(url)
    connection = {
        'engine': 'peewee.PostgresqlDatabase',
    }

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

REDIS_URL = os.environ.get('REDASH_REDIS_URL', "redis://localhost:6379")

# "pg", "graphite" or "mysql"
CONNECTION_ADAPTER = os.environ.get("REDASH_CONNECTION_ADAPTER", "pg")
# Connection string for the database that is used to run queries against. Examples:
# -- mysql:    CONNECTION_STRING = "Server=;User=;Pwd=;Database="
# -- pg:       CONNECTION_STRING = "user= password= host= port=5439 dbname="
# -- graphite: CONNECTION_STRING = {'url': 'https://graphite.yourcompany.com', 'auth': ('user', 'password'), 'verify': True}
CONNECTION_STRING = os.environ.get("REDASH_CONNECTION_STRING", "user= password= host= port=5439 dbname=")

# Connection settings for re:dash's own database (where we store the queries, results, etc)
DATABASE_CONFIG = parse_db_url(os.environ.get("REDASH_DATABASE_URL", "postgresql://postgres"))

# Google Apps domain to allow access from; any user with email in this Google Apps will be allowed
# access
GOOGLE_APPS_DOMAIN = os.environ.get("REDASH_GOOGLE_APPS_DOMAIN", "")
# Email addresses of admin users (comma separated)
ADMINS = array_from_string(os.environ.get("REDASH_ADMINS", ''))
ALLOWED_EXTERNAL_USERS = array_from_string(os.environ.get("REDASH_ALLOWED_EXTERNAL_USERS", ''))
STATIC_ASSETS_PATH = fix_assets_path(os.environ.get("REDASH_STATIC_ASSETS_PATH", "../rd_ui/dist/"))
WORKERS_COUNT = int(os.environ.get("REDASH_WORKERS_COUNT", "2"))
COOKIE_SECRET = os.environ.get("REDASH_COOKIE_SECRET", "c292a0a3aa32397cdb050e233733900f")
LOG_LEVEL = os.environ.get("REDASH_LOG_LEVEL", "INFO")
ANALYTICS = os.environ.get("REDASH_ANALYTICS", "")