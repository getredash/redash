from tests import BaseTestCase
from factories import dashboard_factory


class DashboardTest(BaseTestCase):
    def test_appends_suffix_to_slug_when_duplicate(self):
        d1 = dashboard_factory.create()
        self.assertEquals(d1.slug, 'test')

        d2 = dashboard_factory.create()
        self.assertNotEquals(d1.slug, d2.slug)

        d3 = dashboard_factory.create()
        self.assertNotEquals(d1.slug, d3.slug)
        self.assertNotEquals(d2.slug, d3.slug)