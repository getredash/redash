from flask import request
from flask_restful import abort

from redash import models, redis_connection
from redash.handlers.base import BaseResource, get_object_or_404
from redash.permissions import require_access, view_only
from redash.serializers import serialize_job
from redash.tasks.databricks import (
    get_database_tables_with_columns,
    get_databricks_databases,
    get_databricks_table_columns,
    get_databricks_tables,
)
from redash.utils import json_loads


def _get_databricks_data_source(data_source_id, user, org):
    data_source = get_object_or_404(models.DataSource.get_by_id_and_org, data_source_id, org)
    require_access(data_source, user, view_only)

    if not data_source.type == "databricks":
        abort(400, message="Resource only available for the Databricks query runner.")

    return data_source


def _databases_key(data_source_id):
    return "databricks:databases:{}".format(data_source_id)


def _tables_key(data_source_id, database_name):
    return "databricks:database_tables:{}:{}".format(data_source_id, database_name)


def _get_databases_from_cache(data_source_id):
    cache = redis_connection.get(_databases_key(data_source_id))
    return json_loads(cache) if cache else None


def _get_tables_from_cache(data_source_id, database_name):
    cache = redis_connection.get(_tables_key(data_source_id, database_name))
    return json_loads(cache) if cache else None


class DatabricksDatabaseListResource(BaseResource):
    def get(self, data_source_id):
        data_source = _get_databricks_data_source(data_source_id, user=self.current_user, org=self.current_org)

        refresh = request.args.get("refresh") is not None
        if not refresh:
            cached_databases = _get_databases_from_cache(data_source_id)

            if cached_databases is not None:
                return cached_databases

        job = get_databricks_databases.delay(data_source.id, redis_key=_databases_key(data_source_id))
        return serialize_job(job)


class DatabricksSchemaResource(BaseResource):
    def get(self, data_source_id, database_name):
        data_source = _get_databricks_data_source(data_source_id, user=self.current_user, org=self.current_org)

        refresh = request.args.get("refresh") is not None
        if not refresh:
            cached_tables = _get_tables_from_cache(data_source_id, database_name)

            if cached_tables is not None:
                return {"schema": cached_tables, "has_columns": True}

            job = get_databricks_tables.delay(data_source.id, database_name)
            return serialize_job(job)

        job = get_database_tables_with_columns.delay(
            data_source.id, database_name, redis_key=_tables_key(data_source_id, database_name)
        )
        return serialize_job(job)


class DatabricksTableColumnListResource(BaseResource):
    def get(self, data_source_id, database_name, table_name):
        data_source = _get_databricks_data_source(data_source_id, user=self.current_user, org=self.current_org)

        job = get_databricks_table_columns.delay(data_source.id, database_name, table_name)
        return serialize_job(job)
