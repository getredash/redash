from redash import models, redis_connection
from redash.tasks.worker import Queue
from redash.utils import json_dumps
from redash.worker import job

DATABRICKS_REDIS_EXPIRATION_TIME = 3600


@job("schemas", queue_class=Queue, at_front=True, timeout=300, ttl=90)
def get_databricks_databases(data_source_id, redis_key):
    try:
        data_source = models.DataSource.get_by_id(data_source_id)
        databases = data_source.query_runner.get_databases()
        redis_connection.set(redis_key, json_dumps(databases))
        redis_connection.expire(redis_key, DATABRICKS_REDIS_EXPIRATION_TIME)
        return databases
    except Exception:
        return {"error": {"code": 2, "message": "Error retrieving database list."}}


@job("schemas", queue_class=Queue, at_front=True, timeout=300, ttl=90)
def get_database_tables_with_columns(data_source_id, database_name, redis_key):
    try:
        data_source = models.DataSource.get_by_id(data_source_id)
        tables = data_source.query_runner.get_database_tables_with_columns(database_name)
        # check for tables since it doesn't return an error when the requested database doesn't exist
        if tables or redis_connection.exists(redis_key):
            redis_connection.set(redis_key, json_dumps(tables))
            redis_connection.expire(
                redis_key,
                DATABRICKS_REDIS_EXPIRATION_TIME,
            )
        return {"schema": tables, "has_columns": True}
    except Exception:
        return {"error": {"code": 2, "message": "Error retrieving schema."}}


@job("schemas", queue_class=Queue, at_front=True, timeout=300, ttl=90)
def get_databricks_tables(data_source_id, database_name):
    try:
        data_source = models.DataSource.get_by_id(data_source_id)
        tables = data_source.query_runner.get_database_tables_with_columns(database_name)
        return {"schema": tables, "has_columns": False}
    except Exception:
        return {"error": {"code": 2, "message": "Error retrieving schema."}}


@job("schemas", queue_class=Queue, at_front=True, timeout=300, ttl=90)
def get_databricks_table_columns(data_source_id, database_name, table_name):
    try:
        data_source = models.DataSource.get_by_id(data_source_id)
        return data_source.query_runner.get_table_columns(database_name, table_name)
    except Exception:
        return {"error": {"code": 2, "message": "Error retrieving table columns."}}
