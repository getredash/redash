import json

from flask import make_response, request
from flask.ext.restful import abort
from funcy import project

from redash import models
from redash.permissions import require_admin
from redash.destinations import destinations, validate_configuration
from redash.handlers.base import BaseResource, get_object_or_404


class DestinationTypeListResource(BaseResource):
    @require_admin
    def get(self):
        return [q.to_dict() for q in destinations.values()]


class DestinationResource(BaseResource):
    @require_admin
    def get(self, destination_id):
        destination = models.NotificationDestination.get_by_id_and_org(destination_id, self.current_org)
        return destination.to_dict(all=True)

    @require_admin
    def post(self, destination_id):
        destination = models.NotificationDestination.get_by_id_and_org(destination_id, self.current_org)
        req = request.get_json(True)

        destination.replace_secret_placeholders(req['options'])

        if not validate_configuration(req['type'], req['options']):
            abort(400)

        destination.name = req['name']
        destination.options = json.dumps(req['options'])

        destination.save()

        return destination.to_dict(all=True)

    @require_admin
    def delete(self, destination_id):
        destination = models.NotificationDestination.get_by_id_and_org(destination_id, self.current_org)
        destination.delete_instance(recursive=True)

        return make_response('', 204)


class DestinationListResource(BaseResource):
    def get(self):
        if self.current_user.has_permission('admin'):
            destinations = models.NotificationDestination.all(self.current_org)
        else:
            destinations = models.NotificationDestination.all(self.current_org, groups=self.current_user.groups)

        response = {}
        for ds in destinations:
            if ds.id in response:
                continue

            d = ds.to_dict()
            d['view_only'] = all(project(ds.groups, self.current_user.groups).values())
            response[ds.id] = d

        return response.values()

    @require_admin
    def post(self):
        req = request.get_json(True)
        required_fields = ('options', 'name', 'type')
        for f in required_fields:
            if f not in req:
                abort(400)

        if not validate_configuration(req['type'], req['options']):
            abort(400)

        destination = models.NotificationDestination.create_with_group(org=self.current_org,
                                                         name=req['name'],
                                                         type=req['type'], options=json.dumps(req['options']))

        return destination.to_dict(all=True)
