"""
Example settings module. You should make your own copy as settings.py and enter the real settings.
"""

import django.conf

REDIS_URL = "redis://localhost:6379"

# Either "pg" or "mysql"
CONNECTION_ADAPTER = "mysql"
# Connection string for the database that is used to run queries against
# -- example mysql CONNECTION_STRING = "Server=;User=;Pwd=;Database="
# -- example pg    CONNECTION_STRING = "user= password= host= port=5439 dbname="
CONNECTION_STRING = "user= password= host= port=5439 dbname="
# Connection string for the operational databases (where we store the queries, results, etc)
INTERNAL_DB_CONNECTION_STRING = "dbname=postgres"
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
MAX_CONNECTIONS = 3
COOKIE_SECRET = "c292a0a3aa32397cdb050e233733900f"
LOG_LEVEL = "INFO"
ANALYTICS = ""

# Configuration of the operational database for the Django models
django.conf.settings.configure(DATABASES = { 'default': {
        'ENGINE': 'dbpool.db.backends.postgresql_psycopg2',
        'OPTIONS': {'MAX_CONNS': 10, 'MIN_CONNS': 1},
        'NAME': 'postgres',
        'USER': '',
        'PASSWORD': '',
        'HOST': '',
        'PORT': '',
        },}, TIME_ZONE = 'UTC')
