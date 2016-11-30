from celery import Task
from redash import create_app
from flask import has_app_context, current_app


class BaseTask(Task):
    abstract = True

    def after_return(self, *args, **kwargs):
        if hasattr(self, 'app_ctx'):
            self.app_ctx.pop()

    def __call__(self, *args, **kwargs):
        if not has_app_context():
            flask_app = current_app or create_app()
            self.app_ctx = flask_app.app_context()
            self.app_ctx.push()
        return super(BaseTask, self).__call__(*args, **kwargs)
