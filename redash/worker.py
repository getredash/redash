from celery import Celery
from datetime import timedelta
from redash import settings


celery = Celery('redash',
                broker=settings.CELERY_BROKER,
                include='redash.tasks')

celery.conf.update(CELERY_RESULT_BACKEND=settings.CELERY_BACKEND,
                   CELERY_TASK_SERIALIZER='json',
                   CELERY_ACCEPT_CONTENT = ['json'],
                   CELERYBEAT_SCHEDULE={
                       'refresh_queries': {
                           'task': 'redash.tasks.refresh_queries',
                           'schedule': timedelta(seconds=30)
                       },
                   },
                   CELERY_TIMEZONE='UTC')


if __name__ == '__main__':
    celery.start()