from tests import BaseTestCase
from redash import models
from factories import dashboard_factory, query_factory


class DashboardTest(BaseTestCase):
    def test_appends_suffix_to_slug_when_duplicate(self):
        d1 = dashboard_factory.create()
        self.assertEquals(d1.slug, 'test')

        d2 = dashboard_factory.create(user=d1.user)
        self.assertNotEquals(d1.slug, d2.slug)

        d3 = dashboard_factory.create(user=d1.user)
        self.assertNotEquals(d1.slug, d3.slug)
        self.assertNotEquals(d2.slug, d3.slug)


class QueryTest(BaseTestCase):
    def test_changing_query_text_changes_hash(self):
        q = query_factory.create()

        old_hash = q.query_hash
        models.Query.update_instance(q.id, query="SELECT 2;")

        q = models.Query.get_by_id(q.id)

        self.assertNotEquals(old_hash, q.query_hash)