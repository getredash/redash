from celery import Task
from redash import models


class BaseTask(Task):
    abstract = True

    def after_return(self, *args, **kwargs):
        models.db.close_db(None)

    def __call__(self, *args, **kwargs):
        models.db.connect_db()
        return super(BaseTask, self).__call__(*args, **kwargs)
