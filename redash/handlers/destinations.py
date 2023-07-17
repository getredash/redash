from flask import make_response, request
from flask_restful import abort
from sqlalchemy.exc import IntegrityError

from redash import models
from redash.destinations import (
    destinations,
    get_configuration_schema_for_destination_type,
)
from redash.handlers.base import BaseResource, require_fields
from redash.permissions import require_admin
from redash.utils.configuration import ConfigurationContainer, ValidationError


class DestinationTypeListResource(BaseResource):
    @require_admin
    def get(self):
        return [q.to_dict() for q in destinations.values()]


class DestinationResource(BaseResource):
    @require_admin
    def get(self, destination_id):
        destination = models.NotificationDestination.get_by_id_and_org(destination_id, self.current_org)
        d = destination.to_dict(all=True)
        self.record_event(
            {
                "action": "view",
                "object_id": destination_id,
                "object_type": "destination",
            }
        )
        return d

    @require_admin
    def post(self, destination_id):
        destination = models.NotificationDestination.get_by_id_and_org(destination_id, self.current_org)
        req = request.get_json(True)

        schema = get_configuration_schema_for_destination_type(req["type"])
        if schema is None:
            abort(400)

        try:
            destination.type = req["type"]
            destination.name = req["name"]
            destination.options.set_schema(schema)
            destination.options.update(req["options"])
            models.db.session.add(destination)
            models.db.session.commit()
        except ValidationError:
            abort(400)
        except IntegrityError as e:
            if "name" in str(e):
                abort(
                    400,
                    message="Alert Destination with the name {} already exists.".format(req["name"]),
                )
            abort(500)

        return destination.to_dict(all=True)

    @require_admin
    def delete(self, destination_id):
        destination = models.NotificationDestination.get_by_id_and_org(destination_id, self.current_org)
        models.db.session.delete(destination)
        models.db.session.commit()

        self.record_event(
            {
                "action": "delete",
                "object_id": destination_id,
                "object_type": "destination",
            }
        )

        return make_response("", 204)


class DestinationListResource(BaseResource):
    def get(self):
        destinations = models.NotificationDestination.all(self.current_org)

        response = {}
        for ds in destinations:
            if ds.id in response:
                continue

            d = ds.to_dict()
            response[ds.id] = d

        self.record_event(
            {
                "action": "list",
                "object_id": "admin/destinations",
                "object_type": "destination",
            }
        )

        return list(response.values())

    @require_admin
    def post(self):
        req = request.get_json(True)
        require_fields(req, ("options", "name", "type"))

        schema = get_configuration_schema_for_destination_type(req["type"])
        if schema is None:
            abort(400)

        config = ConfigurationContainer(req["options"], schema)
        if not config.is_valid():
            abort(400)

        destination = models.NotificationDestination(
            org=self.current_org,
            name=req["name"],
            type=req["type"],
            options=config,
            user=self.current_user,
        )

        try:
            models.db.session.add(destination)
            models.db.session.commit()
        except IntegrityError as e:
            if "name" in str(e):
                abort(
                    400,
                    message="Alert Destination with the name {} already exists.".format(req["name"]),
                )
            abort(500)

        return destination.to_dict(all=True)
