from flask_restful import abort
from flask import request
from redash import models, redis_connection
from redash.handlers.base import BaseResource, get_object_or_404
from redash.permissions import (
    require_access,
    view_only,
)
from redash.serializers import serialize_job
from redash.utils import json_loads, json_dumps


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
        data_source = get_object_or_404(
            models.DataSource.get_by_id_and_org, data_source_id, self.current_org
        )
        require_access(data_source, self.current_user, view_only)

        if not data_source.type == "databricks":
            abort(
                400, message="Resource only available for the Databricks query runner."
            )

        refresh = request.args.get("refresh") is not None
        if not refresh:
            cached_databases = _get_databases_from_cache(data_source_id)

            if cached_databases is not None:
                return cached_databases

        try:
            databases = data_source.query_runner.get_databases()
            redis_connection.set(_databases_key(data_source_id), json_dumps(databases))
            return databases
        except Exception:
            return {"error": {"code": 2, "message": "Error retrieving database list."}}


class DatabricksSchemaResource(BaseResource):
    def get(self, data_source_id, database_name):
        data_source = get_object_or_404(
            models.DataSource.get_by_id_and_org, data_source_id, self.current_org
        )
        require_access(data_source, self.current_user, view_only)

        if not data_source.type == "databricks":
            abort(
                400, message="Resource only available for the Databricks query runner."
            )

        refresh = request.args.get("refresh") is not None
        if not refresh:
            cached_tables = _get_tables_from_cache(data_source_id, database_name)

            if cached_tables is not None:
                return cached_tables

        try:
            tables = data_source.query_runner.get_database_schema(database_name)

            # check for tables since it doesn't return an error when the requested database doesn't exist
            if tables or redis_connection.exists(
                _tables_key(data_source_id, database_name)
            ):
                redis_connection.set(
                    _tables_key(data_source_id, database_name), json_dumps(tables)
                )
            return tables
        except Exception:
            return {"error": {"code": 2, "message": "Error retrieving schema."}}
