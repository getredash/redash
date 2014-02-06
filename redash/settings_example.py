"""
Example settings module. You should make your own copy as settings.py and enter the real settings.
"""
REDIS_URL = "redis://localhost:6379"

# Either "pg" or "mysql"
CONNECTION_ADAPTER = "pg"
# Connection string for the database that is used to run queries against
# -- example mysql CONNECTION_STRING = "Server=;User=;Pwd=;Database="
# -- example pg    CONNECTION_STRING = "user= password= host= port=5439 dbname="
CONNECTION_STRING = "user= password= host= port=5439 dbname="
# Connection settings for re:dash's own database (where we store the queries, results, etc)
DATABASE_CONFIG = {
    'name': 'circle_test',
    'engine': 'peewee.PostgresqlDatabase',
}
# Google Apps domain to allow access from; any user with email in this Google Apps will be allowed
# access
GOOGLE_APPS_DOMAIN = ""
# Email addresses of specific users not from the above set Google Apps Domain, that you want to
# allow access to re:dash
ALLOWED_USERS = []
# Email addresses of admin users
ADMINS = []
STATIC_ASSETS_PATH = "../rd_ui/dist/"
WORKERS_COUNT = 2
COOKIE_SECRET = "c292a0a3aa32397cdb050e233733900f"
LOG_LEVEL = "INFO"
ANALYTICS = ""