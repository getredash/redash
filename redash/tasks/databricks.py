from rq.registry import FailedJobRegistry
from redash import models
from redash.worker import job
from redash.tasks.worker import Queue


@job("schemas", queue_class=Queue, at_front=True, timeout=300, ttl=90)
def get_databricks_databases(data_source_id):
    try:
        data_source = models.DataSource.get_by_id(data_source_id)
        return data_source.query_runner.get_databases()
    except Exception:
        return {"error": {"code": 2, "message": "Error retrieving schema."}}


@job("schemas", queue_class=Queue, at_front=True, timeout=300, ttl=90)
def get_databricks_schema(data_source_id, database_name):
    try:
        data_source = models.DataSource.get_by_id(data_source_id)
        return data_source.query_runner.get_database_schema(database_name)
    except Exception:
        return {"error": {"code": 2, "message": "Error retrieving schema."}}
