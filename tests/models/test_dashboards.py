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
        dashboard.layout = '[[{}, {}, {}]]'.format(widget1.id, widget2.id, widget3.id)
        db.session.commit()
        return dashboard

    def test_all_tags(self):
        self.create_tagged_dashboard(tags=[u'tag1'])
        self.create_tagged_dashboard(tags=[u'tag1', u'tag2'])
        self.create_tagged_dashboard(tags=[u'tag1', u'tag2', u'tag3'])

        self.assertEqual(
            list(Dashboard.all_tags(self.factory.org, self.factory.user)),
            [(u'tag1', 3), (u'tag2', 2), (u'tag3', 1)]
        )

    def test_gets_by_original_unhyphenated_slug(self):
        expected = self.factory.create_dashboard(slug='hello')
        actual = Dashboard.get_by_slug_and_org('hello', self.factory.org)
        self.assertEqual(expected, actual)

    def test_gets_by_original_hyphenated_slug(self):
        expected = self.factory.create_dashboard(slug='hello-world')
        actual = Dashboard.get_by_slug_and_org('hello-world', self.factory.org)
        self.assertEqual(expected, actual)

    def test_gets_by_number_name_as_slug(self):
        expected = self.factory.create_dashboard(name='123')
        actual = Dashboard.get_by_slug_and_org('123', self.factory.org)
        self.assertEqual(expected, actual)

    def test_gets_by_id_and_single_word_name_as_slug(self):
        expected = self.factory.create_dashboard(id=123, name='Hello')
        actual = Dashboard.get_by_slug_and_org('123-hello', self.factory.org)
        self.assertEqual(expected, actual)

    def test_gets_by_id_and_multi_word_name_as_slug(self):
        expected = self.factory.create_dashboard(id=123, name='Hello World')
        actual = Dashboard.get_by_slug_and_org('123-hello-world', self.factory.org)
        self.assertEqual(expected, actual)

    def test_gets_by_original_slug_when_name_includes_a_number(self):
        expected = self.factory.create_dashboard(id=123, name='28 Days Growth Metrics')
        actual = Dashboard.get_by_slug_and_org('28-days-growth-metrics', self.factory.org)
        self.assertEqual(expected, actual)

    def test_gets_by_id_when_name_includes_a_number(self):
        expected = self.factory.create_dashboard(id=123, name='28 Days Growth Metrics')
        actual = Dashboard.get_by_slug_and_org('123-28-days-growth-metrics', self.factory.org)
        self.assertEqual(expected, actual)

    def test_gets_by_id_even_when_slug_doesnt_match_name(self):
        expected = self.factory.create_dashboard(id=123, name='28 Days Growth Metrics')
        actual = Dashboard.get_by_slug_and_org('123-i-like-trains', self.factory.org)
        self.assertEqual(expected, actual)