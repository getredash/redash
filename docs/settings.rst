Settings
########

Much of the functionality of Re:dash can be changes with settings. Settings are read by `/redash/settings.py` from environment variables which (for most installs) can be set in `/opt/redash/current/.env`

The follow is a list of settings and what they control:

- **REDASH_NAME**: name of the site, used in page titles, *default "Re:dash"*
- **REDASH_REDIS_URL**: *default "redis://localhost:6379/0"*
- **REDASH_PROXIES_COUNT**: *default "1"*
- **REDASH_STATSD_HOST**: *default "127.0.0.1"*
- **REDASH_STATSD_PORT**: *default "8125"*
- **REDASH_STATSD_PREFIX**: *default "redash"*
- **REDASH_DATABASE_URL**: *default "postgresql://postgres"*
- **REDASH_CELERY_BROKER**: *default REDIS_URL*
- **REDASH_CELERY_BACKEND**: *default CELERY_BROKER*
- **REDASH_HEROKU_CELERY_WORKER_COUNT**: *default 2*
- **REDASH_QUERY_RESULTS_CLEANUP_ENABLED**: *default "true"*
- **REDASH_QUERY_RESULTS_CLEANUP_COUNT**: *default "100"*
- **REDASH_QUERY_RESULTS_CLEANUP_MAX_AGE**: *default "7"*
- **REDASH_AUTH_TYPE**: *default "api_key"*
- **REDASH_PASSWORD_LOGIN_ENABLED**: *default "true"*
- **REDASH_ENFORCE_HTTPS**: *default "false"*
- **REDASH_MULTI_ORG**: *default "false"*
- **REDASH_GOOGLE_CLIENT_ID**: *default ""*
- **REDASH_GOOGLE_CLIENT_SECRET**: *default ""*
- **REDASH_SAML_METADATA_URL**: *default ""*
- **REDASH_SAML_CALLBACK_SERVER_NAME**: *default ""*
- **REDASH_STATIC_ASSETS_PATH**: *default "../rd_ui/app/"*
- **REDASH_JOB_EXPIRY_TIME**: *default 3600 * 6*
- **REDASH_COOKIE_SECRET**: *default "c292a0a3aa32397cdb050e233733900f"*
- **REDASH_LOG_LEVEL**: *default "INFO"*
- **REDASH_MAIL_SERVER**: *default "localhost"*
- **REDASH_MAIL_PORT**: *default 25*
- **REDASH_MAIL_USE_TLS**: *default "false"*
- **REDASH_MAIL_USE_SSL**: *default "false"*
- **REDASH_MAIL_USERNAME**: *default None*
- **REDASH_MAIL_PASSWORD**: *default None*
- **REDASH_MAIL_DEFAULT_SENDER**: *default None*
- **REDASH_MAIL_MAX_EMAILS**: *default None*
- **REDASH_MAIL_ASCII_ATTACHMENTS**: *default "false"*
- **REDASH_HOST**: *default ""*
- **REDASH_HIPCHAT_API_TOKEN**: *default None*
- **REDASH_HIPCHAT_API_URL**: *default None*
- **REDASH_HIPCHAT_ROOM_ID**: *default None*
- **REDASH_WEBHOOK_ENDPOINT**: *default None*
- **REDASH_WEBHOOK_USERNAME**: *default None*
- **REDASH_CORS_ACCESS_CONTROL_ALLOW_ORIGIN**: *default ""*
- **REDASH_CORS_ACCESS_CONTROL_ALLOW_CREDENTIALS**: *default "false"*
- **REDASH_CORS_ACCESS_CONTROL_REQUEST_METHOD**: *default GET, POST, PUT""*
- **REDASH_CORS_ACCESS_CONTROL_ALLOW_HEADERS**: *default "Content-Type"*
- **REDASH_ENABLED_QUERY_RUNNERS**: *default ",".join(default_query_runners)*
- **REDASH_ADDITIONAL_QUERY_RUNNERS**: *default ""*
- **REDASH_SENTRY_DSN**: *default ""*
- **REDASH_ALLOW_SCRIPTS_IN_USER_INPUT**: disable sanitization of text input, allowing full HTML, *default "true"*
- **REDASH_DATE_FORMAT**: *default "DD/MM/YY"*
- **REDASH_FEATURE_ALLOW_ALL_TO_EDIT**: *default "true"*
- **REDASH_FEATURE_TABLES_PERMISSIONS**: *default "false"*
- **REDASH_VERSION_CEHCK**: *default "true"*
- **REDASH_FEATURE_DISABLE_REFRESH_QUERIES**: disable scheduled query execution, *default "false"*
- **REDASH_BIGQUERY_HTTP_TIMEOUT**: *default "600"*
- **REDASH_SCHEMA_RUN_TABLE_SIZE_CALCULATIONS**: *default "false"*
