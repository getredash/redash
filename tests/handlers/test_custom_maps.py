import json

from redash.models import CustomMap
from tests import BaseTestCase

VALID_GEOJSON = json.dumps({"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"name": "Test"}, "geometry": {"type": "Point", "coordinates": [0, 0]}}]})
INVALID_JSON = "not json at all"
NO_FEATURES_JSON = json.dumps({"type": "Topology", "objects": {}})


class TestCustomMapListResource(BaseTestCase):
    def test_list_empty(self):
        rv = self.make_request("get", "/api/custom_maps")
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json, [])

    def test_list_with_maps(self):
        admin = self.factory.create_admin()
        m1 = CustomMap(name="Map A", geojson=VALID_GEOJSON, user=admin, org=self.factory.org)
        m2 = CustomMap(name="Map B", geojson=VALID_GEOJSON, user=admin, org=self.factory.org)
        from redash.models import db

        db.session.add_all([m1, m2])
        db.session.commit()

        rv = self.make_request("get", "/api/custom_maps")
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(len(rv.json), 2)
        names = [m["name"] for m in rv.json]
        self.assertIn("Map A", names)
        self.assertIn("Map B", names)

    def test_list_scoped_to_org(self):
        admin = self.factory.create_admin()
        m1 = CustomMap(name="Map A", geojson=VALID_GEOJSON, user=admin, org=self.factory.org)
        other_org = self.factory.create_org()
        other_admin = self.factory.create_admin(org=other_org)
        m2 = CustomMap(name="Map B", geojson=VALID_GEOJSON, user=other_admin, org=other_org)
        from redash.models import db

        db.session.add_all([m1, m2])
        db.session.commit()

        rv = self.make_request("get", "/api/custom_maps")
        self.assertEqual(len(rv.json), 1)
        self.assertEqual(rv.json[0]["name"], "Map A")

    def test_list_does_not_include_geojson(self):
        """The list endpoint should not return the full geojson blob."""
        admin = self.factory.create_admin()
        m = CustomMap(name="Map A", geojson=VALID_GEOJSON, user=admin, org=self.factory.org)
        from redash.models import db

        db.session.add(m)
        db.session.commit()

        rv = self.make_request("get", "/api/custom_maps")
        self.assertNotIn("geojson", rv.json[0])

    def test_create_as_admin(self):
        admin = self.factory.create_admin()
        data = {"name": "Kenya Counties", "geojson": VALID_GEOJSON}
        rv = self.make_request("post", "/api/custom_maps", data=data, user=admin)
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["name"], "Kenya Counties")
        self.assertIsNotNone(rv.json["id"])

    def test_create_rejected_for_non_admin(self):
        data = {"name": "Kenya Counties", "geojson": VALID_GEOJSON}
        rv = self.make_request("post", "/api/custom_maps", data=data)
        self.assertEqual(rv.status_code, 403)

    def test_create_missing_fields(self):
        admin = self.factory.create_admin()
        rv = self.make_request("post", "/api/custom_maps", data={"name": "Test"}, user=admin)
        self.assertEqual(rv.status_code, 400)

    def test_create_rejects_oversized_geojson(self):
        admin = self.factory.create_admin()
        big_geojson = json.dumps({"type": "FeatureCollection", "features": [], "padding": "x" * (11 * 1024 * 1024)})
        data = {"name": "Big Map", "geojson": big_geojson}
        rv = self.make_request("post", "/api/custom_maps", data=data, user=admin)
        self.assertEqual(rv.status_code, 400)
        self.assertIn("too large", rv.json["message"])
        self.assertEqual(CustomMap.query.count(), 0)

    def test_create_rejects_invalid_json(self):
        admin = self.factory.create_admin()
        data = {"name": "Bad Map", "geojson": INVALID_JSON}
        rv = self.make_request("post", "/api/custom_maps", data=data, user=admin)
        self.assertEqual(rv.status_code, 400)
        self.assertIn("valid JSON", rv.json["message"])

    def test_create_rejects_non_featurecollection(self):
        admin = self.factory.create_admin()
        data = {"name": "Bad Map", "geojson": NO_FEATURES_JSON}
        rv = self.make_request("post", "/api/custom_maps", data=data, user=admin)
        self.assertEqual(rv.status_code, 400)
        self.assertIn("FeatureCollection", rv.json["message"])

    def test_create_duplicate_name_returns_400(self):
        admin = self.factory.create_admin()
        m = CustomMap(name="Kenya Counties", geojson=VALID_GEOJSON, user=admin, org=self.factory.org)
        from redash.models import db

        db.session.add(m)
        db.session.commit()

        data = {"name": "Kenya Counties", "geojson": VALID_GEOJSON}
        rv = self.make_request("post", "/api/custom_maps", data=data, user=admin)
        self.assertEqual(rv.status_code, 400)
        self.assertIn("already exists", rv.json["message"])


class TestCustomMapResource(BaseTestCase):
    def _create_map(self, **kwargs):
        admin = self.factory.create_admin()
        defaults = {"name": "Test Map", "geojson": VALID_GEOJSON, "user": admin, "org": self.factory.org}
        defaults.update(kwargs)
        m = CustomMap(**defaults)
        from redash.models import db

        db.session.add(m)
        db.session.commit()
        return m, admin

    def test_get_map(self):
        m, _ = self._create_map()
        rv = self.make_request("get", f"/api/custom_maps/{m.id}")
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["name"], "Test Map")

    def test_update_name_only(self):
        m, admin = self._create_map()
        rv = self.make_request("post", f"/api/custom_maps/{m.id}", data={"name": "Updated"}, user=admin)
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["name"], "Updated")

    def test_update_geojson(self):
        m, admin = self._create_map()
        new_geojson = json.dumps({"type": "FeatureCollection", "features": []})
        rv = self.make_request(
            "post", f"/api/custom_maps/{m.id}",
            data={"geojson": new_geojson},
            user=admin,
        )
        self.assertEqual(rv.status_code, 200)
        from redash.models import db
        db.session.refresh(m)
        self.assertEqual(m.geojson, new_geojson)

    def test_update_rejects_invalid_geojson(self):
        m, admin = self._create_map()
        rv = self.make_request(
            "post", f"/api/custom_maps/{m.id}",
            data={"geojson": INVALID_JSON},
            user=admin,
        )
        self.assertEqual(rv.status_code, 400)
        self.assertIn("valid JSON", rv.json["message"])

    def test_update_duplicate_name_returns_400(self):
        m1, admin = self._create_map(name="Map One")
        m2 = CustomMap(name="Map Two", geojson=VALID_GEOJSON, user=admin, org=self.factory.org)
        from redash.models import db

        db.session.add(m2)
        db.session.commit()

        rv = self.make_request("post", f"/api/custom_maps/{m2.id}", data={"name": "Map One"}, user=admin)
        self.assertEqual(rv.status_code, 400)
        self.assertIn("already exists", rv.json["message"])

    def test_update_rejected_for_non_admin(self):
        m, _ = self._create_map()
        rv = self.make_request("post", f"/api/custom_maps/{m.id}", data={"name": "Updated"})
        self.assertEqual(rv.status_code, 403)

    def test_delete_as_admin(self):
        m, admin = self._create_map()
        rv = self.make_request("delete", f"/api/custom_maps/{m.id}", user=admin)
        self.assertEqual(rv.status_code, 200)
        self.assertIsNone(CustomMap.query.get(m.id))

    def test_delete_rejected_for_non_admin(self):
        m, _ = self._create_map()
        rv = self.make_request("delete", f"/api/custom_maps/{m.id}")
        self.assertEqual(rv.status_code, 403)


class TestCustomMapGeoJsonResource(BaseTestCase):
    def _create_map(self, geojson=VALID_GEOJSON):
        admin = self.factory.create_admin()
        m = CustomMap(name="Test Map", geojson=geojson, user=admin, org=self.factory.org)
        from redash.models import db

        db.session.add(m)
        db.session.commit()
        return m

    def test_geojson_endpoint_returns_stored_data(self):
        m = self._create_map()
        rv = self.make_request("get", f"/api/custom_maps/{m.id}/geojson")
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(json.loads(rv.data), json.loads(VALID_GEOJSON))

    def test_geojson_endpoint_headers(self):
        m = self._create_map()
        rv = self.make_request("get", f"/api/custom_maps/{m.id}/geojson")
        self.assertEqual(rv.headers["Content-Type"], "application/json")
        self.assertIn("private", rv.headers["Cache-Control"])
        self.assertEqual(rv.headers["X-Content-Type-Options"], "nosniff")

    def test_geojson_not_found(self):
        rv = self.make_request("get", "/api/custom_maps/9999/geojson")
        self.assertEqual(rv.status_code, 404)

    def test_geojson_with_dashboard_api_key(self):
        """GeoJSON endpoint must be accessible via a dashboard API key (public dashboards)."""
        m = self._create_map()
        dashboard = self.factory.create_dashboard()
        api_key = self.factory.create_api_key(object=dashboard)

        rv = self.make_request(
            "get",
            "/api/custom_maps/{}/geojson?api_key={}".format(m.id, api_key.api_key),
            user=False,
        )
        self.assertEqual(rv.status_code, 200)
        self.assertEqual(json.loads(rv.data), json.loads(VALID_GEOJSON))
