from flask_restful import abort
from redash import models
from redash.handlers.base import BaseResource, get_object_or_404
from redash.permissions import (
    require_access,
    view_only,
)
from redash.serializers import serialize_job


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

        try:
            return data_source.query_runner.get_databases()
        except Exception:
            return {"error": {"code": 2, "message": "Error retrieving schema."}}


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

        try:
            return data_source.query_runner.get_database_schema(database_name)
        except Exception:
            return {"error": {"code": 2, "message": "Error retrieving schema."}}
