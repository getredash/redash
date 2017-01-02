from flask import make_response, request
from flask_restful import abort

from redash import models
from redash.permissions import require_admin
from redash.destinations import destinations, get_configuration_schema_for_destination_type
from redash.utils.configuration import ConfigurationContainer, ValidationError
from redash.handlers.base import BaseResource


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

        schema = get_configuration_schema_for_destination_type(req['type'])
        if schema is None:
            abort(400)

        try:
            destination.options.set_schema(schema)
            destination.options.update(req['options'])
            models.db.session.add(destination)
            models.db.session.commit()
        except ValidationError:
            abort(400)

        destination.type = req['type']
        destination.name = req['name']

        return destination.to_dict(all=True)

    @require_admin
    def delete(self, destination_id):
        destination = models.NotificationDestination.get_by_id_and_org(destination_id, self.current_org)
        models.db.session.delete(destination)
        models.db.session.commit()

        return make_response('', 204)


class DestinationListResource(BaseResource):
    def get(self):
        destinations = models.NotificationDestination.all(self.current_org)

        response = {}
        for ds in destinations:
            if ds.id in response:
                continue

            d = ds.to_dict()
            response[ds.id] = d

        return response.values()

    @require_admin
    def post(self):
        req = request.get_json(True)
        required_fields = ('options', 'name', 'type')
        for f in required_fields:
            if f not in req:
                abort(400)

        schema = get_configuration_schema_for_destination_type(req['type'])
        if schema is None:
            abort(400)

        config = ConfigurationContainer(req['options'], schema)
        if not config.is_valid():
            abort(400)

        destination = models.NotificationDestination(org=self.current_org,
                                                     name=req['name'],
                                                     type=req['type'],
                                                     options=config,
                                                     user=self.current_user)

        models.db.session.add(destination)
        models.db.session.commit()
        return destination.to_dict(all=True)
