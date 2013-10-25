import django.conf

REDIS_URL = "redis://localhost:6379"
CONNECTION_STRING = "user= password= host= port=5439 dbname="
GOOGLE_APPS_DOMAIN = ""
STATIC_ASSETS_PATH = "../rd_ui/dist/"
ALLOWED_USERS = []
ADMINS = []
WORKERS_COUNT = 2
MAX_CONNECTIONS = 3
INTERNAL_DB_CONNECTION_STRING = "dbname=postgres"

django.conf.settings.configure(DATABASES = { 'default': {
        'ENGINE': 'dbpool.db.backends.postgresql_psycopg2',
        'OPTIONS': {'MAX_CONNS': 10, 'MIN_CONNS': 1},
        'NAME': 'postgres',
        'USER': '',
        'PASSWORD': '',
        'HOST': '',
        'PORT': '',
        },}, TIME_ZONE = 'UTC')
