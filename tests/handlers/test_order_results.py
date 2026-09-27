from redash import models
from redash.handlers.base import order_results
from redash.models import db
from tests import BaseTestCase


class TestOrderResults(BaseTestCase):
    def setUp(self):
        super().setUp()

        user1 = self.factory.create_user(name="Charlie")
        user2 = self.factory.create_user(name="Bravo")
        user3 = self.factory.create_user(name="Alpha")

        q1 = self.factory.create_query(name="a", user=user1)
        q2 = self.factory.create_query(name="b", user=user2)
        q3 = self.factory.create_query(name="c", user=user3)

        db.session.add(user1)
        db.session.add(user2)
        db.session.add(user3)

        db.session.add(q1)
        db.session.add(q2)
        db.session.add(q3)
        db.session.commit()

        self.results = db.session.query(models.Query)
        self.results = self.results.join(models.User, models.Query.user_id == models.User.id)

        self.allowed_orders = {
            "name": "name",
            "-name": "-name",
            "users-name": "users-name",
            "-users-name": "-users-name",
        }
        self.default_order = "-name"

    def test_no_order_no_fallback(self):
        with self.app.test_request_context("/items?order="):
            ordered_results = order_results(self.results, self.default_order, self.allowed_orders, fallback=False)
            self.assertEqual(self.results, ordered_results)

    def test_no_order_yes_fallback(self):
        with self.app.test_request_context("/items?order="):
            ordered_results = order_results(self.results, self.default_order, self.allowed_orders, fallback=True)
            ordered_results = [entry.name for entry in ordered_results]
            self.assertEqual(ordered_results, ["c", "b", "a"])

    def test_invalid_order_no_fallback(self):
        with self.app.test_request_context("/items?order=some_invalid_order"):
            ordered_results = order_results(self.results, self.default_order, self.allowed_orders, fallback=False)
            ordered_results = [entry.name for entry in ordered_results]
            self.assertEqual(ordered_results, [entry.name for entry in self.results])

    def test_invalid_order_yes_fallback(self):
        with self.app.test_request_context("/items?order=some_invalid_order"):
            ordered_results = order_results(self.results, self.default_order, self.allowed_orders, fallback=True)
            ordered_results = [entry.name for entry in ordered_results]
            self.assertEqual(ordered_results, ["c", "b", "a"])

    def test_valid_requested_order_no_fallback(self):
        with self.app.test_request_context("/items?order=name"):
            ordered_results = order_results(self.results, self.default_order, self.allowed_orders, fallback=False)
            ordered_results = [entry.name for entry in ordered_results]
            self.assertEqual(ordered_results, ["a", "b", "c"])

    def test_valid_requested_order_yes_fallback(self):
        with self.app.test_request_context("/items?order=name"):
            ordered_results = order_results(self.results, self.default_order, self.allowed_orders, fallback=True)
            ordered_results = [entry.name for entry in ordered_results]
            self.assertEqual(ordered_results, ["a", "b", "c"])

    def test_requested_entity_no_fallback(self):
        with self.app.test_request_context("/items?order=users-name"):
            ordered_results = order_results(self.results, self.default_order, self.allowed_orders, fallback=False)
            ordered_results = [entry.name for entry in ordered_results]
            self.assertEqual(ordered_results, ["c", "b", "a"])

    def test_requested_entity_yes_fallback(self):
        with self.app.test_request_context("/items?order=-users-name"):
            ordered_results = order_results(self.results, self.default_order, self.allowed_orders, fallback=True)
            ordered_results = [entry.name for entry in ordered_results]
            self.assertEqual(ordered_results, ["a", "b", "c"])

    def test_order_by_attached(self):
        self.results = self.results.order_by(models.Query.name)
        with self.app.test_request_context("/items?order=-name"):
            ordered_results = order_results(self.results, self.default_order, self.allowed_orders, fallback=False)
            ordered_results = [entry.name for entry in ordered_results]
            self.assertEqual(ordered_results, ["c", "b", "a"])

    def test_ignores_tables_the_query_does_not_join(self):
        results = db.session.query(models.Query)
        allowed_orders = {"users-name": "users-name"}
        with self.app.test_request_context("/items?order=users-name"):
            ordered_results = order_results(results, "", allowed_orders, fallback=False)
            self.assertNotIn("users", str(ordered_results.statement.compile()))
            self.assertEqual(3, ordered_results.count())

    def test_ignores_table_sort_for_column_only_query(self):
        results = db.session.query(models.Query.__table__.c.name).join(
            models.User, models.Query.user_id == models.User.id
        )
        allowed_orders = {"users-name": "users-name"}
        with self.app.test_request_context("/items?order=users-name"):
            ordered_results = order_results(results, "", allowed_orders, fallback=False)
            self.assertEqual(3, ordered_results.count())

    def test_order_by_label(self):
        results = db.session.query(models.User.name, models.User.id.label("user_order"))
        allowed_orders = {"-user_order": "-user_order"}
        with self.app.test_request_context("/items?order=-user_order"):
            ordered_results = order_results(results, "", allowed_orders, fallback=False)
            ids = [row.user_order for row in ordered_results]
            self.assertEqual(sorted(ids, reverse=True), ids)
