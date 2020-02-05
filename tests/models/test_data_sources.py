import mock
from mock import patch
from tests import BaseTestCase

from redash.models import DataSource, Query, QueryResult
from redash.utils.configuration import ConfigurationContainer


class DataSourceTest(BaseTestCase):
    def test_get_schema(self):
        return_value = [{"name": "table", "columns": []}]

        with mock.patch(
            "redash.query_runner.pg.PostgreSQL.get_schema"
        ) as patched_get_schema:
            patched_get_schema.return_value = return_value

            schema = self.factory.data_source.get_schema()

            self.assertEqual(return_value, schema)

    def test_get_schema_uses_cache(self):
        return_value = [{"name": "table", "columns": []}]
        with mock.patch(
            "redash.query_runner.pg.PostgreSQL.get_schema"
        ) as patched_get_schema:
            patched_get_schema.return_value = return_value

            self.factory.data_source.get_schema()
            schema = self.factory.data_source.get_schema()

            self.assertEqual(return_value, schema)
            self.assertEqual(patched_get_schema.call_count, 1)

    def test_get_schema_skips_cache_with_refresh_true(self):
        return_value = [{"name": "table", "columns": []}]
        with mock.patch(
            "redash.query_runner.pg.PostgreSQL.get_schema"
        ) as patched_get_schema:
            patched_get_schema.return_value = return_value

            self.factory.data_source.get_schema()
            new_return_value = [{"name": "new_table", "columns": []}]
            patched_get_schema.return_value = new_return_value
            schema = self.factory.data_source.get_schema(refresh=True)

            self.assertEqual(new_return_value, schema)
            self.assertEqual(patched_get_schema.call_count, 2)


class TestDataSourceCreate(BaseTestCase):
    def test_adds_data_source_to_default_group(self):
        data_source = DataSource.create_with_group(
            org=self.factory.org,
            name="test",
            options=ConfigurationContainer.from_json('{"dbname": "test"}'),
            type="pg",
        )
        self.assertIn(self.factory.org.default_group.id, data_source.groups)


class TestDataSourceIsPaused(BaseTestCase):
    def test_returns_false_by_default(self):
        self.assertFalse(self.factory.data_source.paused)

    def test_persists_selection(self):
        self.factory.data_source.pause()
        self.assertTrue(self.factory.data_source.paused)

        self.factory.data_source.resume()
        self.assertFalse(self.factory.data_source.paused)

    def test_allows_setting_reason(self):
        reason = "Some good reason."
        self.factory.data_source.pause(reason)
        self.assertTrue(self.factory.data_source.paused)
        self.assertEqual(self.factory.data_source.pause_reason, reason)

    def test_resume_clears_reason(self):
        self.factory.data_source.pause("Reason")
        self.factory.data_source.resume()
        self.assertEqual(self.factory.data_source.pause_reason, None)

    def test_reason_is_none_by_default(self):
        self.assertEqual(self.factory.data_source.pause_reason, None)


class TestDataSourceDelete(BaseTestCase):
    def test_deletes_the_data_source(self):
        data_source = self.factory.create_data_source()
        data_source.delete()

        self.assertIsNone(DataSource.query.get(data_source.id))

    def test_sets_queries_data_source_to_null(self):
        data_source = self.factory.create_data_source()
        query = self.factory.create_query(data_source=data_source)

        data_source.delete()
        self.assertIsNone(DataSource.query.get(data_source.id))
        self.assertIsNone(Query.query.get(query.id).data_source_id)

    def test_deletes_child_models(self):
        data_source = self.factory.create_data_source()
        self.factory.create_query_result(data_source=data_source)
        self.factory.create_query(
            data_source=data_source,
            latest_query_data=self.factory.create_query_result(data_source=data_source),
        )

        data_source.delete()
        self.assertIsNone(DataSource.query.get(data_source.id))
        self.assertEqual(
            0, QueryResult.query.filter(QueryResult.data_source == data_source).count()
        )

    @patch("redash.redis_connection.delete")
    def test_deletes_schema(self, mock_redis):
        data_source = self.factory.create_data_source()
        data_source.delete()

        mock_redis.assert_called_with(data_source._schema_key)
