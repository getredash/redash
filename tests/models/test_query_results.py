import datetime

from redash import models
from redash.utils import utcnow
from tests import BaseTestCase


class QueryResultTest(BaseTestCase):
    def test_get_latest_returns_none_if_not_found(self):
        found_query_result = models.QueryResult.get_latest(self.factory.data_source, "SELECT 1", 60)
        self.assertIsNone(found_query_result)

    def test_get_latest_returns_when_found(self):
        qr = self.factory.create_query_result()
        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query_text, 60)

        self.assertEqual(qr, found_query_result)

    def test_get_latest_doesnt_return_query_from_different_data_source(self):
        qr = self.factory.create_query_result()
        data_source = self.factory.create_data_source()
        found_query_result = models.QueryResult.get_latest(data_source, qr.query_text, 60)

        self.assertIsNone(found_query_result)

    def test_get_latest_doesnt_return_if_ttl_expired(self):
        yesterday = utcnow() - datetime.timedelta(days=1)
        qr = self.factory.create_query_result(retrieved_at=yesterday)

        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query_text, max_age=60)

        self.assertIsNone(found_query_result)

    def test_get_latest_returns_if_ttl_not_expired(self):
        yesterday = utcnow() - datetime.timedelta(seconds=30)
        qr = self.factory.create_query_result(retrieved_at=yesterday)

        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query_text, max_age=120)

        self.assertEqual(found_query_result, qr)

    def test_get_latest_returns_the_most_recent_result(self):
        yesterday = utcnow() - datetime.timedelta(seconds=30)
        self.factory.create_query_result(retrieved_at=yesterday)
        qr = self.factory.create_query_result()

        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query_text, 60)

        self.assertEqual(found_query_result.id, qr.id)

    def test_get_latest_returns_the_last_cached_result_for_negative_ttl(self):
        yesterday = utcnow() + datetime.timedelta(days=-100)
        self.factory.create_query_result(retrieved_at=yesterday)

        yesterday = utcnow() + datetime.timedelta(days=-1)
        qr = self.factory.create_query_result(retrieved_at=yesterday)
        found_query_result = models.QueryResult.get_latest(qr.data_source, qr.query_text, -1)

        self.assertEqual(found_query_result.id, qr.id)

    def test_store_result_does_not_modify_query_update_at(self):
        original_updated_at = utcnow() - datetime.timedelta(hours=1)
        query = self.factory.create_query(updated_at=original_updated_at)

        models.QueryResult.store_result(
            query.org_id,
            query.data_source,
            query.query_hash,
            query.query_text,
            {},
            0,
            utcnow(),
        )

        self.assertEqual(original_updated_at, query.updated_at)


def make_data(row_count):
    return {
        "columns": [{"name": "n", "type": "integer"}],
        "rows": [{"n": n} for n in range(row_count)],
    }


class QueryResultRowsTest(BaseTestCase):
    def store(self, data):
        query_result = models.QueryResult.store_result(
            self.factory.org.id, self.factory.data_source, "hash", "SELECT 1", data, 0, utcnow()
        )
        models.db.session.commit()
        models.db.session.expire_all()
        return models.QueryResult.query.get(query_result.id)

    def stored_row_indexes(self, query_result_id):
        rows = models.QueryResultRow.query.filter_by(query_result_id=query_result_id)
        return sorted(row.row_index for row in rows)

    def test_stores_each_row_separately(self):
        query_result = self.store(dict(make_data(10), metadata={"foo": "bar"}))

        self.assertEqual(self.stored_row_indexes(query_result.id), list(range(10)))
        self.assertNotIn("rows", query_result._data)
        self.assertEqual(query_result.row_count, 10)
        self.assertEqual(query_result.columns, make_data(10)["columns"])
        self.assertEqual(query_result.get_data(), dict(make_data(10), metadata={"foo": "bar"}))
        self.assertEqual(list(query_result.iter_rows(batch_size=3)), make_data(10)["rows"])

    def test_get_rows_reads_only_the_requested_rows(self):
        query_result = self.store(make_data(10))
        models.QueryResultRow.query.filter(
            models.QueryResultRow.query_result_id == query_result.id,
            ~models.QueryResultRow.row_index.in_([4, 5]),
        ).delete(synchronize_session=False)

        self.assertEqual(query_result.get_rows(4, 2), [{"n": 4}, {"n": 5}])

    def test_get_rows_bounds(self):
        rows = make_data(10)["rows"]
        query_result = self.store(make_data(10))

        self.assertEqual(query_result.get_rows(0, 2), rows[:2])
        self.assertEqual(query_result.get_rows(8, 100), rows[8:])
        self.assertEqual(query_result.get_rows(10, 5), [])
        self.assertEqual(query_result.get_rows(3, 0), [])
        self.assertEqual(query_result.get_rows(), rows)

    def test_to_dict_returns_one_page_and_the_total(self):
        query_result = self.store(make_data(10))

        result = query_result.to_dict(offset=2, limit=3)

        self.assertEqual(result["data"], {"columns": make_data(10)["columns"], "rows": make_data(10)["rows"][2:5]})
        self.assertEqual(result["row_count"], 10)
        self.assertEqual(query_result.to_dict()["data"]["rows"], [])

    def test_result_without_data(self):
        query_result = self.store(None)

        self.assertIsNone(query_result.get_data())
        self.assertEqual(query_result.row_count, 0)
        self.assertEqual(query_result.to_dict(limit=10)["data"], None)

    def test_rows_are_not_readable_through_data(self):
        query_result = self.store(make_data(3))

        with self.assertRaises(AttributeError):
            query_result.data

    def test_deleting_result_deletes_its_rows(self):
        query_result = self.store(make_data(10))

        models.QueryResult.query.filter(models.QueryResult.id == query_result.id).delete(synchronize_session=False)
        models.db.session.commit()

        self.assertEqual(self.stored_row_indexes(query_result.id), [])

    def test_stores_more_rows_than_one_insert_batch(self):
        query_result = self.store(make_data(2500))

        self.assertEqual(query_result.row_count, 2500)
        self.assertEqual(query_result.get_rows(1999, 2), [{"n": 1999}, {"n": 2000}])
