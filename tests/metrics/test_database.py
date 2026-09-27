from unittest import TestCase

from mock import ANY, call, patch
from sqlalchemy import select

from redash.metrics.database import _table_name_from_select_element
from redash.models import Query, User
from tests import BaseTestCase


@patch("statsd.StatsClient.timing")
class TestDatabaseMetrics(BaseTestCase):
    def test_db_request_records_statsd_metrics(self, timing):
        self.factory.create_query()
        timing.assert_called_with("db.changes.insert", ANY)

    def test_select_records_table_name(self, timing):
        query = self.factory.create_query()
        Query.query.filter(Query.id.in_(Query.query.with_entities(Query.id).subquery())).all()
        Query.query.join(User, Query.user_id == User.id).filter(Query.id == query.id).all()
        timing.assert_any_call("db.queries.select", ANY)
        self.assertNotIn(call("db.unknown.select", ANY), timing.call_args_list)


class TestTableNameFromSelect(TestCase):
    def test_table(self):
        self.assertEqual("queries", _table_name_from_select_element(select(Query.id)))

    def test_join(self):
        statement = select(Query.id).join(User, Query.user_id == User.id)
        self.assertEqual("queries", _table_name_from_select_element(statement))

    def test_subquery(self):
        subquery = select(Query.id).subquery()
        self.assertEqual("queries", _table_name_from_select_element(select(subquery.c.id)))
