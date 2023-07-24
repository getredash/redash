from collections import defaultdict

from flask import request
from flask_restful import abort
from sqlalchemy.orm.exc import NoResultFound

from redash.handlers.base import BaseResource, get_object_or_404
from redash.models import AccessPermission, Dashboard, Query, User, db
from redash.permissions import ACCESS_TYPES, require_admin_or_owner

model_to_types = {"queries": Query, "dashboards": Dashboard}


def get_model_from_type(type):
    model = model_to_types.get(type)
    if model is None:
        abort(404)
    return model


class ObjectPermissionsListResource(BaseResource):
    def get(self, object_type, object_id):
        model = get_model_from_type(object_type)
        obj = get_object_or_404(model.get_by_id_and_org, object_id, self.current_org)

        # TODO: include grantees in search to avoid N+1 queries
        permissions = AccessPermission.find(obj)

        result = defaultdict(list)

        for perm in permissions:
            result[perm.access_type].append(perm.grantee.to_dict())

        return result

    def post(self, object_type, object_id):
        model = get_model_from_type(object_type)
        obj = get_object_or_404(model.get_by_id_and_org, object_id, self.current_org)

        require_admin_or_owner(obj.user_id)

        req = request.get_json(True)

        access_type = req["access_type"]

        if access_type not in ACCESS_TYPES:
            abort(400, message="Unknown access type.")

        try:
            grantee = User.get_by_id_and_org(req["user_id"], self.current_org)
        except NoResultFound:
            abort(400, message="User not found.")

        permission = AccessPermission.grant(obj, access_type, grantee, self.current_user)
        db.session.commit()

        self.record_event(
            {
                "action": "grant_permission",
                "object_id": object_id,
                "object_type": object_type,
                "grantee": grantee.id,
                "access_type": access_type,
            }
        )

        return permission.to_dict()

    def delete(self, object_type, object_id):
        model = get_model_from_type(object_type)
        obj = get_object_or_404(model.get_by_id_and_org, object_id, self.current_org)

        require_admin_or_owner(obj.user_id)

        req = request.get_json(True)
        grantee_id = req["user_id"]
        access_type = req["access_type"]

        grantee = User.query.get(req["user_id"])
        if grantee is None:
            abort(400, message="User not found.")

        AccessPermission.revoke(obj, grantee, access_type)
        db.session.commit()

        self.record_event(
            {
                "action": "revoke_permission",
                "object_id": object_id,
                "object_type": object_type,
                "access_type": access_type,
                "grantee_id": grantee_id,
            }
        )


class CheckPermissionResource(BaseResource):
    def get(self, object_type, object_id, access_type):
        model = get_model_from_type(object_type)
        obj = get_object_or_404(model.get_by_id_and_org, object_id, self.current_org)

        has_access = AccessPermission.exists(obj, access_type, self.current_user)

        return {"response": has_access}
