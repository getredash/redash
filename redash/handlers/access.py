import logging
from redash.handlers.base import BaseResource
from redash.models import AccessPermission
from flask import request
from flask_restful import abort

class AccessListResource(BaseResource):

    def get(self, object_type, object_id):

        permissions = AccessPermission.select(AccessPermission)\
                .where(AccessPermission.object_id == object_id)\
                .where(AccessPermission.object_type == object_type)\
                .where(AccessPermission.grantor == self.current_user)

        result = {}
        for perm in permissions:
            if perm.access_type not in result:
                result[perm.access_type] = []
            result[perm.access_type].append(perm.grantee.to_dict())

        return result


class AccessGrantResource(BaseResource):

    def post(self, object_type, object_id):

        req = request.get_json(True)
        grantee = req['user_id']
        access_type = req['access_type']

        permissions = AccessPermission.select(AccessPermission)\
                .where(AccessPermission.object_id == object_id)\
                .where(AccessPermission.object_type == object_type)\
                .where(AccessPermission.grantee == grantee)\
                .where(AccessPermission.grantor == self.current_user)\
                .where(AccessPermission.access_type == access_type)

        if permissions.count() > 0:
            return {'result': 'already_granted'}

        perm = AccessPermission()
        perm.object_type = object_type
        perm.object_id = object_id
        perm.access_type = access_type
        perm.grantor = self.current_user
        perm.grantee = grantee
        perm.save()
        return {'result': 'permission_added'}

class AccessRevokeResource(BaseResource):

    def delete(self, object_type, object_id):

        req = request.get_json(True)
        grantee = req['user_id']
        access_type = req['access_type']

        query = AccessPermission.delete()\
                .where(AccessPermission.object_id == object_id)\
                .where(AccessPermission.object_type == object_type)\
                .where(AccessPermission.access_type == access_type)\
                .where(AccessPermission.grantee == grantee)\
                .where(AccessPermission.grantor == self.current_user)
        deleted = query.execute()
        result = {'deleted': deleted}
        return result

class AccessAttemptResource(BaseResource):

    def post(self, object_type, object_id, access_type):
        access = AccessPermission.exists(user=self.current_user, access_type=access_type, object_id=object_id, object_type=object_type)
        if access:
            return {'result': 'access_granted'}
        abort(403)
        return False
