import datetime

from redash import models
from redash.tasks.queries.maintenance import cleanup_query_results
from redash.utils import utcnow
from tests import BaseTestCase


class TestCleanupQueryResults(BaseTestCase):
    def test_deletes_only_old_unused_results(self):
        old = utcnow() - datetime.timedelta(days=30)
        unused_old = self.factory.create_query_result(retrieved_at=old)
        unused_recent = self.factory.create_query_result()
        used_old = self.factory.create_query_result(retrieved_at=old)
        self.factory.create_query(latest_query_data=used_old)
        ids = [unused_old.id, unused_recent.id, used_old.id]
        models.db.session.commit()

        cleanup_query_results()

        remaining = {r.id for r in models.QueryResult.query.filter(models.QueryResult.id.in_(ids))}
        self.assertEqual({unused_recent.id, used_old.id}, remaining)
