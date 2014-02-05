from tests import BaseTestCase, DashboardFactory


class DashboardTest(BaseTestCase):
    def test_appends_suffix_to_slug_when_duplicate(self):
        d1 = DashboardFactory.create()
        self.assertEquals(d1.slug, 'test')

        d2 = DashboardFactory.create()
        self.assertNotEquals(d1.slug, d2.slug)

        d3 = DashboardFactory.create()
        self.assertNotEquals(d1.slug, d3.slug)
        self.assertNotEquals(d2.slug, d3.slug)