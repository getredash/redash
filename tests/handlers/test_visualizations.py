from redash import models
from tests import BaseTestCase


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
        self.assertEqual(rv.json, {**rv.json, **data})

    def test_new_visualization_is_appended_after_the_existing_ones(self):
        query = self.factory.create_query()
        first = self.factory.create_visualization(query_rel=query, position=0)
        second = self.factory.create_visualization(query_rel=query, position=1)
        models.db.session.commit()

        rv = self.make_request(
            "post",
            "/api/visualizations",
            data={
                "query_id": query.id,
                "name": "Chart",
                "description": "",
                "options": {},
                "type": "CHART",
            },
        )

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["position"], 2)
        self.assertEqual([first.position, second.position], [0, 1])

    def test_ignores_a_client_supplied_position(self):
        query = self.factory.create_query()
        self.factory.create_visualization(query_rel=query, position=0)
        self.factory.create_visualization(query_rel=query, position=1)
        models.db.session.commit()

        rv = self.make_request(
            "post",
            "/api/visualizations",
            data={
                "query_id": query.id,
                "name": "Chart",
                "description": "",
                "options": {},
                "type": "CHART",
                "position": -5,
            },
        )

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["position"], 2)

    def test_update_ignores_a_client_supplied_position(self):
        query = self.factory.create_query()
        visualization = self.factory.create_visualization(query_rel=query, position=7)
        models.db.session.commit()

        rv = self.make_request(
            "post",
            "/api/visualizations/{}".format(visualization.id),
            data={"name": "Renamed", "position": -99},
        )

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["name"], "Renamed")
        self.assertEqual(rv.json["position"], 7)

    def test_delete_visualization(self):
        visualization = self.factory.create_visualization()
        models.db.session.commit()
        rv = self.make_request("delete", "/api/visualizations/{}".format(visualization.id))

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

        rv = self.make_request("post", "/api/visualizations", data=data, user=other_user)
        self.assertEqual(rv.status_code, 403)

        self.make_request(
            "post",
            "/api/queries/{}/acl".format(query.id),
            data={"access_type": "modify", "user_id": other_user.id},
        )
        rv = self.make_request("post", "/api/visualizations", data=data, user=other_user)
        self.assertEqual(rv.status_code, 200)

        rv = self.make_request("post", "/api/visualizations", data=data, user=admin_from_diff_org)
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

        self.make_request("delete", "/api/visualizations/{}".format(vis.id))

        self.assertIsNone(models.Widget.query.filter(models.Widget.id == widget.id).first())


class QueryVisualizationsReorderResourceTest(BaseTestCase):
    def create_query_with_visualizations(self, count=3, **kwargs):
        query = self.factory.create_query(**kwargs)
        visualizations = [
            self.factory.create_visualization(query_rel=query, name="Vis {}".format(i), position=i)
            for i in range(count)
        ]
        models.db.session.commit()
        return query, visualizations

    def test_reorder_visualizations(self):
        query, visualizations = self.create_query_with_visualizations()
        reordered_ids = [visualizations[2].id, visualizations[0].id, visualizations[1].id]

        rv = self.make_request(
            "post",
            "/api/queries/{}/visualizations/reorder".format(query.id),
            data={"ids": reordered_ids},
        )

        self.assertEqual(rv.status_code, 200)
        self.assertEqual([vis["id"] for vis in rv.json], reordered_ids)
        self.assertEqual([vis["position"] for vis in rv.json], [0, 1, 2])
        self.assertEqual(
            [visualizations[2].position, visualizations[0].position, visualizations[1].position], [0, 1, 2]
        )

    def test_reordered_query_returns_visualizations_in_the_new_order(self):
        query, visualizations = self.create_query_with_visualizations()
        reordered_ids = [visualizations[1].id, visualizations[2].id, visualizations[0].id]

        self.make_request(
            "post",
            "/api/queries/{}/visualizations/reorder".format(query.id),
            data={"ids": reordered_ids},
        )
        models.db.session.expire_all()

        rv = self.make_request("get", "/api/queries/{}".format(query.id))
        self.assertEqual([vis["id"] for vis in rv.json["visualizations"]], reordered_ids)

    def test_rejects_a_partial_list_of_visualizations(self):
        query, visualizations = self.create_query_with_visualizations()

        rv = self.make_request(
            "post",
            "/api/queries/{}/visualizations/reorder".format(query.id),
            data={"ids": [visualizations[0].id]},
        )

        self.assertEqual(rv.status_code, 400)
        self.assertEqual([vis.position for vis in visualizations], [0, 1, 2])

    def test_rejects_duplicated_ids(self):
        query, visualizations = self.create_query_with_visualizations()

        rv = self.make_request(
            "post",
            "/api/queries/{}/visualizations/reorder".format(query.id),
            data={"ids": [visualizations[0].id, visualizations[0].id, visualizations[1].id]},
        )

        self.assertEqual(rv.status_code, 400)
        self.assertEqual([vis.position for vis in visualizations], [0, 1, 2])

    def test_rejects_a_visualization_of_another_query(self):
        query, visualizations = self.create_query_with_visualizations()
        other_visualization = self.factory.create_visualization()
        models.db.session.commit()

        rv = self.make_request(
            "post",
            "/api/queries/{}/visualizations/reorder".format(query.id),
            data={"ids": [visualizations[0].id, visualizations[1].id, other_visualization.id]},
        )

        self.assertEqual(rv.status_code, 400)
        self.assertEqual([vis.position for vis in visualizations], [0, 1, 2])

    def test_rejects_a_payload_that_is_not_an_object(self):
        query, visualizations = self.create_query_with_visualizations()
        path = "/api/queries/{}/visualizations/reorder".format(query.id)

        for payload in ([visualizations[0].id], "ids", 42):
            rv = self.make_request("post", path, data=payload)
            self.assertEqual(rv.status_code, 400)

        self.assertEqual([vis.position for vis in visualizations], [0, 1, 2])

    def test_rejects_ids_that_are_not_a_list(self):
        query, visualizations = self.create_query_with_visualizations()

        rv = self.make_request(
            "post",
            "/api/queries/{}/visualizations/reorder".format(query.id),
            data={"ids": "not-a-list"},
        )

        self.assertEqual(rv.status_code, 400)

    def test_rejects_unhashable_ids(self):
        query, visualizations = self.create_query_with_visualizations()

        rv = self.make_request(
            "post",
            "/api/queries/{}/visualizations/reorder".format(query.id),
            data={"ids": [[visualizations[0].id], visualizations[1].id, visualizations[2].id]},
        )

        self.assertEqual(rv.status_code, 400)

    def test_rejects_non_int_ids_even_when_numerically_equal(self):
        query, visualizations = self.create_query_with_visualizations()

        rv = self.make_request(
            "post",
            "/api/queries/{}/visualizations/reorder".format(query.id),
            data={"ids": [visualizations[0].id, float(visualizations[1].id), visualizations[2].id]},
        )

        self.assertEqual(rv.status_code, 400)

    def test_returns_404_for_unknown_query(self):
        rv = self.make_request("post", "/api/queries/0/visualizations/reorder", data={"ids": []})
        self.assertEqual(rv.status_code, 404)

    def test_only_owner_collaborator_or_admin_can_reorder_visualizations(self):
        query, visualizations = self.create_query_with_visualizations()
        reordered_ids = [visualizations[2].id, visualizations[1].id, visualizations[0].id]

        other_user = self.factory.create_user()
        admin = self.factory.create_admin()
        admin_from_diff_org = self.factory.create_admin(org=self.factory.create_org())
        models.db.session.commit()
        models.db.session.refresh(admin)
        models.db.session.refresh(other_user)
        models.db.session.refresh(admin_from_diff_org)

        path = "/api/queries/{}/visualizations/reorder".format(query.id)
        data = {"ids": reordered_ids}

        rv = self.make_request("post", path, user=admin, data=data)
        self.assertEqual(rv.status_code, 200)

        rv = self.make_request("post", path, user=other_user, data=data)
        self.assertEqual(rv.status_code, 403)

        self.make_request(
            "post",
            "/api/queries/{}/acl".format(query.id),
            data={"access_type": "modify", "user_id": other_user.id},
        )
        rv = self.make_request("post", path, user=other_user, data=data)
        self.assertEqual(rv.status_code, 200)

        rv = self.make_request("post", path, user=admin_from_diff_org, data=data)
        self.assertEqual(rv.status_code, 404)
