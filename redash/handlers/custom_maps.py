import json
import logging

from flask import make_response, request
from funcy import project
from sqlalchemy.exc import IntegrityError

from redash import models
from redash.handlers.base import BaseResource, get_object_or_404, require_fields
from redash.permissions import require_admin

logger = logging.getLogger(__name__)

MAX_GEOJSON_SIZE = 10 * 1024 * 1024  # 10 MB


def _validate_geojson(geojson_str):
    """Validate an uploaded GeoJSON string.

    Returns None on success, or a (error_dict, status_code) tuple on failure.
    """
    if not isinstance(geojson_str, str):
        return {"message": "GeoJSON data must be a string."}, 400

    try:
        size = len(geojson_str.encode("utf-8"))
    except (UnicodeEncodeError, UnicodeDecodeError):
        return {"message": "GeoJSON contains invalid characters."}, 400

    if size > MAX_GEOJSON_SIZE:
        return {"message": "GeoJSON file is too large. Maximum size is 10 MB."}, 400

    try:
        data = json.loads(geojson_str)
    except (json.JSONDecodeError, ValueError):
        return {"message": "File does not contain valid JSON. Please upload a GeoJSON file."}, 400

    if not isinstance(data, dict) or "features" not in data:
        return {"message": "File is valid JSON but does not appear to be a GeoJSON FeatureCollection."}, 400

    return None


class CustomMapListResource(BaseResource):
    def get(self):
        self.record_event({"action": "list", "object_type": "custom_map"})
        return [m.to_dict() for m in models.CustomMap.all(org=self.current_org)]

    @require_admin
    def post(self):
        req = request.get_json(True)
        require_fields(req, ("name", "geojson"))

        error = _validate_geojson(req["geojson"])
        if error:
            return error

        custom_map = models.CustomMap(
            name=req["name"],
            geojson=req["geojson"],
            user=self.current_user,
            org=self.current_org,
        )
        models.db.session.add(custom_map)
        try:
            models.db.session.commit()
        except IntegrityError:
            models.db.session.rollback()
            return {"message": "A custom map with this name already exists."}, 400

        self.record_event({"action": "create", "object_id": custom_map.id, "object_type": "custom_map"})
        return custom_map.to_dict()


class CustomMapResource(BaseResource):
    def get(self, map_id):
        custom_map = get_object_or_404(models.CustomMap.get_by_id_and_org, map_id, self.current_org)
        return custom_map.to_dict()

    @require_admin
    def post(self, map_id):
        custom_map = get_object_or_404(models.CustomMap.get_by_id_and_org, map_id, self.current_org)
        req = request.get_json(True)
        params = project(req, ("name", "geojson"))

        if "geojson" in params:
            error = _validate_geojson(params["geojson"])
            if error:
                return error

        self.update_model(custom_map, params)
        try:
            models.db.session.commit()
        except IntegrityError:
            models.db.session.rollback()
            return {"message": "A custom map with this name already exists."}, 400

        self.record_event({"action": "edit", "object_id": custom_map.id, "object_type": "custom_map"})
        return custom_map.to_dict()

    @require_admin
    def delete(self, map_id):
        custom_map = get_object_or_404(models.CustomMap.get_by_id_and_org, map_id, self.current_org)
        models.db.session.delete(custom_map)
        models.db.session.commit()

        self.record_event({"action": "delete", "object_id": custom_map.id, "object_type": "custom_map"})


class CustomMapGeoJsonResource(BaseResource):
    def get(self, map_id):
        custom_map = get_object_or_404(models.CustomMap.get_by_id_and_org, map_id, self.current_org)

        resp = make_response(custom_map.geojson)
        resp.headers["Content-Type"] = "application/json"
        resp.headers["Cache-Control"] = "private, max-age=3600"
        resp.headers["X-Content-Type-Options"] = "nosniff"
        return resp
