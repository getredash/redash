from flask import request
from redash import models
from redash.permissions import require_admin
from redash.handlers.base import BaseResource
from redash.models import Organization


class OrganizationListResource(BaseResource):
    def get(self):
        return [self.current_org.to_dict()]


class OrganizationResource(BaseResource):
    @require_admin
    def post(self, org_id):
        settings = request.json['settings']
        org = Organization.query.get(org_id)
        self.update_model(org, {"settings": settings})
        models.db.session.commit()

        return org.to_dict()
