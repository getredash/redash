from functools import wraps
import time
import logging
from playhouse.gfk import Model
from playhouse.postgres_ext import PostgresqlExtDatabase
from redash import statsd_client

metrics_logger = logging.getLogger("metrics")


class MeteredPostgresqlExtDatabase(PostgresqlExtDatabase):
    def __init__(self, *args, **kwargs):
        self.query_count = 0
        self.query_duration = 0
        return super(MeteredPostgresqlExtDatabase, self).__init__(*args, **kwargs)

    def execute_sql(self, *args, **kwargs):
        start_time = time.time()

        try:
            result = super(MeteredPostgresqlExtDatabase, self).execute_sql(*args, **kwargs)
            return result
        finally:
            self.query_count += 1
            # TODO: there is a noticeable few ms discrepancy between the duration here and the one calculated in
            # metered_execute. Need to think what to do about it.
            duration = (time.time() - start_time) * 1000
            self.query_duration += duration

    def reset_metrics(self):
        # TODO: instead of manually managing reset of metrics, we should store them in a LocalProxy based object, that
        # is guaranteed to be "replaced" when the current request is done.
        self.query_count = 0
        self.query_duration = 0


def patch_query_execute():
    real_execute = peewee.Query._execute
    real_clone = peewee.Query.clone

    @wraps(real_execute)
    def metered_execute(self, *args, **kwargs):
        name = self.model_class.__name__

        action = getattr(self, 'model_action', 'unknown')

        start_time = time.time()
        try:
            result = real_execute(self, *args, **kwargs)
            return result
        finally:
            duration = (time.time() - start_time) * 1000
            statsd_client.timing('db.{}.{}'.format(name, action), duration)
            metrics_logger.debug("model=%s query=%s duration=%.2f", name, action, duration)

    @wraps(real_clone)
    def extended_clone(self):
        cloned = real_clone(self)
        setattr(cloned, 'model_action', getattr(self, 'model_action', 'unknown'))
        return cloned

    peewee.Query._execute = metered_execute
    peewee.Query.clone = extended_clone


class MeteredModel(Model):
    @classmethod
    def select(cls, *args, **kwargs):
        return cls._execute_and_measure('select', args, kwargs)

    @classmethod
    def update(cls, *args, **kwargs):
        return cls._execute_and_measure('update', args, kwargs)

    @classmethod
    def insert(cls, *args, **kwargs):
        return cls._execute_and_measure('insert', args, kwargs)

    @classmethod
    def insert_many(cls, *args, **kwargs):
        return cls._execute_and_measure('insert_many', args, kwargs)

    @classmethod
    def insert_from(cls, *args, **kwargs):
        return cls._execute_and_measure('insert_from', args, kwargs)

    @classmethod
    def delete(cls, *args, **kwargs):
        return cls._execute_and_measure('delete', args, kwargs)

    @classmethod
    def raw(cls, *args, **kwargs):
        return cls._execute_and_measure('raw', args, kwargs)

    @classmethod
    def _execute_and_measure(cls, action, args, kwargs):
        result = getattr(super(MeteredModel, cls), action)(*args, **kwargs)
        setattr(result, 'model_action', action)
        return result
