from tests import BaseTestCase
from redash.models import db, Dashboard


class DashboardTest(BaseTestCase):
    def create_tagged_dashboard(self, tags):
        dashboard = self.factory.create_dashboard(tags=tags)
        ds = self.factory.create_data_source(group=self.factory.default_group)
        query = self.factory.create_query(data_source=ds)
        # We need a bunch of visualizations and widgets configured
        # to trigger wrong counts via the left outer joins.
        vis1 = self.factory.create_visualization(query_rel=query)
        vis2 = self.factory.create_visualization(query_rel=query)
        vis3 = self.factory.create_visualization(query_rel=query)
        widget1 = self.factory.create_widget(visualization=vis1, dashboard=dashboard)
        widget2 = self.factory.create_widget(visualization=vis2, dashboard=dashboard)
        widget3 = self.factory.create_widget(visualization=vis3, dashboard=dashboard)
        dashboard.layout = "[[{}, {}, {}]]".format(widget1.id, widget2.id, widget3.id)
        db.session.commit()
        return dashboard

    def test_all_tags(self):
        self.create_tagged_dashboard(tags=["tag1"])
        self.create_tagged_dashboard(tags=["tag1", "tag2"])
        self.create_tagged_dashboard(tags=["tag1", "tag2", "tag3"])

        self.assertEqual(
            list(Dashboard.all_tags(self.factory.org, self.factory.user)),
            [("tag1", 3), ("tag2", 2), ("tag3", 1)],
        )


class TestDashboardsByUser(BaseTestCase):
    def test_returns_only_users_dashboards(self):
        d = self.factory.create_dashboard(user=self.factory.user)
        d2 = self.factory.create_dashboard(user=self.factory.create_user())

        dashboards = Dashboard.by_user(self.factory.user)

        # not using self.assertIn/NotIn because otherwise this fails :O
        self.assertTrue(d in list(dashboards))
        self.assertFalse(d2 in list(dashboards))

    def test_returns_drafts_by_the_user(self):
        d = self.factory.create_dashboard(is_draft=True)
        d2 = self.factory.create_dashboard(is_draft=True, user=self.factory.create_user())

        dashboards = Dashboard.by_user(self.factory.user)

        # not using self.assertIn/NotIn because otherwise this fails :O
        self.assertTrue(d in dashboards)
        self.assertFalse(d2 in dashboards)
