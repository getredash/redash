from redash.handlers.base import BaseResource
from redash.wsgi import api
from redash.models import Group


class GroupsAPI(BaseResource):
    def get(self):
        return [group.to_dict() for group in Group.select()]

api.add_resource(GroupsAPI, '/api/groups', endpoint='groups')
