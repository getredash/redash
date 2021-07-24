from tests import BaseTestCase

from redash import models


class VisualizationResourceTest(BaseTestCase):
    def test_create_visualization(self):
        query = self.factory.create_query()
        models.db.session.commit()
        data = {
            "query_id": query.id,
            "name": "Chart",
            "description": "",
            "options": {},
            "type": "CHART",
        }

        rv = self.make_request("post", "/api/visualizations", data=data)

        self.assertEqual(rv.status_code, 200)
        data.pop("query_id")
        self.assertDictContainsSubset(data, rv.json)

    def test_delete_visualization(self):
        visualization = self.factory.create_visualization()
        models.db.session.commit()
        rv = self.make_request(
            "delete", "/api/visualizations/{}".format(visualization.id)
        )

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(models.Visualization.query.count(), 0)

    def test_update_visualization(self):
        visualization = self.factory.create_visualization()
        models.db.session.commit()
        rv = self.make_request(
            "post",
            "/api/visualizations/{0}".format(visualization.id),
            data={"name": "After Update"},
        )

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["name"], "After Update")

    def test_only_owner_collaborator_or_admin_can_create_visualization(self):
        query = self.factory.create_query()
        other_user = self.factory.create_user()
        admin = self.factory.create_admin()
        admin_from_diff_org = self.factory.create_admin(org=self.factory.create_org())
        models.db.session.commit()
        models.db.session.refresh(admin)
        models.db.session.refresh(other_user)
        models.db.session.refresh(admin_from_diff_org)
        data = {
            "query_id": query.id,
            "name": "Chart",
            "description": "",
            "options": {},
            "type": "CHART",
        }

        rv = self.make_request("post", "/api/visualizations", data=data, user=admin)
        self.assertEqual(rv.status_code, 200)

        rv = self.make_request(
            "post", "/api/visualizations", data=data, user=other_user
        )
        self.assertEqual(rv.status_code, 403)

        self.make_request(
            "post",
            "/api/queries/{}/acl".format(query.id),
            data={"access_type": "modify", "user_id": other_user.id},
        )
        rv = self.make_request(
            "post", "/api/visualizations", data=data, user=other_user
        )
        self.assertEqual(rv.status_code, 200)

        rv = self.make_request(
            "post", "/api/visualizations", data=data, user=admin_from_diff_org
        )
        self.assertEqual(rv.status_code, 404)

    def test_only_owner_collaborator_or_admin_can_edit_visualization(self):
        vis = self.factory.create_visualization()
        models.db.session.flush()
        path = "/api/visualizations/{}".format(vis.id)
        data = {"name": "After Update"}

        other_user = self.factory.create_user()
        admin = self.factory.create_admin()
        admin_from_diff_org = self.factory.create_admin(org=self.factory.create_org())
        models.db.session.commit()
        models.db.session.refresh(admin)
        models.db.session.refresh(other_user)
        models.db.session.refresh(admin_from_diff_org)

        rv = self.make_request("post", path, user=admin, data=data)
        self.assertEqual(rv.status_code, 200)

        rv = self.make_request("post", path, user=other_user, data=data)
        self.assertEqual(rv.status_code, 403)

        self.make_request(
            "post",
            "/api/queries/{}/acl".format(vis.query_id),
            data={"access_type": "modify", "user_id": other_user.id},
        )
        rv = self.make_request("post", path, user=other_user, data=data)
        self.assertEqual(rv.status_code, 200)

        rv = self.make_request("post", path, user=admin_from_diff_org, data=data)
        self.assertEqual(rv.status_code, 404)

    def test_only_owner_collaborator_or_admin_can_delete_visualization(self):
        vis = self.factory.create_visualization()
        models.db.session.flush()
        path = "/api/visualizations/{}".format(vis.id)

        other_user = self.factory.create_user()
        admin = self.factory.create_admin()
        admin_from_diff_org = self.factory.create_admin(org=self.factory.create_org())

        models.db.session.commit()
        models.db.session.refresh(admin)
        models.db.session.refresh(other_user)
        models.db.session.refresh(admin_from_diff_org)
        rv = self.make_request("delete", path, user=admin)
        self.assertEqual(rv.status_code, 200)

        vis = self.factory.create_visualization()
        models.db.session.commit()
        path = "/api/visualizations/{}".format(vis.id)

        rv = self.make_request("delete", path, user=other_user)
        self.assertEqual(rv.status_code, 403)

        self.make_request(
            "post",
            "/api/queries/{}/acl".format(vis.query_id),
            data={"access_type": "modify", "user_id": other_user.id},
        )

        rv = self.make_request("delete", path, user=other_user)
        self.assertEqual(rv.status_code, 200)

        vis = self.factory.create_visualization()
        models.db.session.commit()
        path = "/api/visualizations/{}".format(vis.id)

        rv = self.make_request("delete", path, user=admin_from_diff_org)
        self.assertEqual(rv.status_code, 404)

    def test_deleting_a_visualization_deletes_dashboard_widgets(self):
        vis = self.factory.create_visualization()
        widget = self.factory.create_widget(visualization=vis)

        rv = self.make_request("delete", "/api/visualizations/{}".format(vis.id))

        self.assertIsNone(
            models.Widget.query.filter(models.Widget.id == widget.id).first()
        )
