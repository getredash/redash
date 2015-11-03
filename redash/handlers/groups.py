import json

from redash.handlers.base import BaseResource
from redash.wsgi import api
from flask import make_response
from redash import utils
from redash.models import Group

class GroupsAPI(BaseResource):
    def get(self):
        return self.make_json_response(Group.select())

    def make_json_response(self, groups):
        data = json.dumps({'groups': [group.to_dict() for group in groups]}, cls=utils.JSONEncoder)
        return make_response(data, 200, {})

api.add_resource(GroupsAPI, '/api/groups', endpoint='groups')
