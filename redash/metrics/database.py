import time
import logging
from peewee import Model
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
            self.query_duration += (time.time() - start_time) * 1000

    def reset_metrics(self):
        self.query_count = 0
        self.query_duration = 0


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
        name = cls.__name__
        start_time = time.time()
        try:
            result = getattr(super(MeteredModel, cls), action)(*args, **kwargs)
            return result
        finally:
            duration = (time.time() - start_time)*1000
            statsd_client.timing('db.{}.{}'.format(name, action), duration)
            metrics_logger.debug("model=%s query=%s duration=%.2f", name, action, duration)

