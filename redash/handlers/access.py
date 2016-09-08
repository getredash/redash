import logging
from redash.handlers.base import BaseResource
from redash.models import AccessPermission, Query, Dashboard
from redash.permissions import require_admin_or_owner
from flask import request
from flask_restful import abort


object_types_to_classes = {
    'queries': Query,
    'dashboards': Dashboard
}


def get_class_for_object_type(object_type):
    clazz = object_types_to_classes.get(object_type)
    if not clazz:
        abort(404)
    return clazz


def get_classname_for_object_type(object_type):
    clazz = get_class_for_object_type(object_type)
    return clazz.__name__


class AccessPermissionListResource(BaseResource):

    def get(self, object_type, object_id):

        # convert API resource to model class, e.g., 'queries' to 'Query'
        object_type = get_classname_for_object_type(object_type)

        permissions = AccessPermission.find(object_id=object_id,
            object_type=object_type, grantor=self.current_user)

        result = {}
        for perm in permissions:
            if perm.access_type not in result:
                result[perm.access_type] = []
            result[perm.access_type].append(perm.grantee.to_dict())

        return result


class AccessPermissionResource(BaseResource):

    def post(self, object_type, object_id):

        # convert API resource to model class, e.g., 'queries' to 'Query'
        clazz = get_class_for_object_type(object_type)
        object_type = get_classname_for_object_type(object_type)

        # make sure the current user is permitted to perform this operation
        target_object = clazz.select().where(clazz.id == object_id).get()
        require_admin_or_owner(target_object.user.id)

        req = request.get_json(True)
        grantee = req['user_id']
        access_type = req['access_type']

        permissions = AccessPermission.find(grantee=grantee, object_id=object_id,
            object_type=object_type, access_type=access_type, grantor=self.current_user)

        if permissions.count() > 0:
            return {'result': 'already_granted'}

        AccessPermission.grant_permission(object_type=object_type,
            object_id=object_id, access_type=access_type,
            grantee=grantee, grantor=self.current_user)

        return {'result': 'permission_added'}

    def delete(self, object_type, object_id):

        # convert API resource to model class, e.g., 'queries' to 'Query'
        clazz = get_class_for_object_type(object_type)
        object_type = get_classname_for_object_type(object_type)

        # make sure the current user is permitted to perform this operation
        target_object = clazz.select().where(clazz.id == object_id).get()
        require_admin_or_owner(target_object.user.id)

        req = request.get_json(True)
        grantee = req['user_id']
        access_type = req['access_type']

        deleted = AccessPermission.revoke_permission(object_type=object_type,
            object_id=object_id, grantee=grantee, access_type=access_type)
        if deleted:
            deleted = deleted.to_dict()
        result = {'deleted': deleted}
        return result

    def get(self, object_type, object_id, access_type):

        # convert API resource to model class, e.g., 'queries' to 'Query'
        object_type = get_classname_for_object_type(object_type)

        access = AccessPermission.exists(grantee=self.current_user, access_type=access_type, object_id=object_id, object_type=object_type)
        if access:
            return {'result': 'access_granted'}
        abort(403)
