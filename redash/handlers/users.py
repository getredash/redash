from flask import request
from flask.ext.restful import abort
from funcy import project

from redash import models
from redash.wsgi import api
from redash.permissions import require_permission, require_admin_or_owner
from redash.handlers.base import BaseResource, require_fields


class UserListResource(BaseResource):
    def get(self):
        return [u.to_dict() for u in models.User.select()]

    @require_permission('admin')
    def post(self):
        # TODO: send invite.
        req = request.get_json(force=True)
        require_fields(req, ('name', 'email', 'password'))

        user = models.User(name=req['name'], email=req['email'])
        user.hash_password(req['password'])
        user.save()

        return user.to_dict()


class UserResource(BaseResource):
    def get(self, user_id):
        user = models.User.get_by_id(user_id)
        return user.to_dict()

    def post(self, user_id):
        user = models.User.get_by_id(user_id)
        require_admin_or_owner(user_id)

        req = request.get_json(True)

        # grant admin?
        params = project(req, ('email', 'name', 'password', 'old_password'))

        if 'password' in params and 'old_password' not in params:
            abort(403)

        if 'old_password' in params and not user.verify_password(params['old_password']):
            abort(403)

        if 'password' in params:
            user.hash_password(params.pop('password'))
            params.pop('old_password')

        user.update_instance(**params)

        return user.to_dict()


api.add_resource(UserListResource, '/api/users', endpoint='users')
api.add_resource(UserResource, '/api/users/<user_id>', endpoint='user')


