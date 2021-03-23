from tests import BaseTestCase
from redash import models


class WidgetAPITest(BaseTestCase):
    def create_widget(self, dashboard, visualization, width=1):
        data = {
            "visualization_id": visualization.id,
            "dashboard_id": dashboard.id,
            "options": {},
            "width": width,
        }

        rv = self.make_request("post", "/api/widgets", data=data)

        return rv

    def test_create_widget(self):
        dashboard = self.factory.create_dashboard()
        vis = self.factory.create_visualization()

        rv = self.create_widget(dashboard, vis)
        self.assertEqual(rv.status_code, 200)

    def test_wont_create_widget_for_visualization_you_dont_have_access_to(self):
        dashboard = self.factory.create_dashboard()
        vis = self.factory.create_visualization()
        ds = self.factory.create_data_source(group=self.factory.create_group())
        vis.query_rel.data_source = ds

        models.db.session.add(vis.query_rel)

        data = {
            "visualization_id": vis.id,
            "dashboard_id": dashboard.id,
            "options": {},
            "width": 1,
        }

        rv = self.make_request("post", "/api/widgets", data=data)
        self.assertEqual(rv.status_code, 403)

    def test_create_text_widget(self):
        dashboard = self.factory.create_dashboard()

        data = {
            "visualization_id": None,
            "text": "Sample text.",
            "dashboard_id": dashboard.id,
            "options": {},
            "width": 2,
        }

        rv = self.make_request("post", "/api/widgets", data=data)

        self.assertEqual(rv.status_code, 200)
        self.assertEqual(rv.json["text"], "Sample text.")

    def test_delete_widget(self):
        widget = self.factory.create_widget()

        rv = self.make_request("delete", "/api/widgets/{0}".format(widget.id))

        self.assertEqual(rv.status_code, 200)
        dashboard = models.Dashboard.get_by_slug_and_org(
            widget.dashboard.slug, widget.dashboard.org
        )
        self.assertEqual(dashboard.widgets.count(), 0)
