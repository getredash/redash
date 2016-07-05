web: ./manage.py runserver -d -r -p $PORT --host 0.0.0.0
worker: celery worker --app=redash.worker -c${REDASH_HEROKU_CELERY_WORKER_COUNT:-2} --beat -Q queries,celery,scheduled_queries
