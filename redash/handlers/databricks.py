from flask_restful import abort
from redash import models
from redash.handlers.base import BaseResource, get_object_or_404
from redash.permissions import (
    require_access,
    view_only,
)
from redash.tasks.databricks import get_databricks_databases, get_databricks_schema
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

        job = get_databricks_databases.delay(data_source.id)
        return serialize_job(job)


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

        job = get_databricks_schema.delay(data_source.id, database_name)
        return serialize_job(job)
