import copy

from mock import patch
from tests import BaseTestCase

from redash import models
from redash.tasks import refresh_schemas, refresh_schema
from redash.models import TableMetadata, ColumnMetadata


class TestRefreshSchemas(BaseTestCase):
    def setUp(self):
        super(TestRefreshSchemas, self).setUp()

        self.COLUMN_NAME = 'first_column'
        self.COLUMN_TYPE = 'text'
        self.COLUMN_EXAMPLE = 'some text for column value'
        self.EXPECTED_COLUMN_METADATA = {
            'id': 1,
            'org_id': 1,
            'table_id': 1,
            'column_name': self.COLUMN_NAME,
            'column_type': self.COLUMN_TYPE,
            'column_example': self.COLUMN_EXAMPLE,
            'column_exists': True,
        }

        get_schema_patcher = patch('redash.query_runner.pg.PostgreSQL.get_schema')
        self.patched_get_schema = get_schema_patcher.start()
        self.addCleanup(get_schema_patcher.stop)
        self.default_schema_return_value = [{
            'name': 'table',
            'columns': [self.COLUMN_NAME],
            'metadata': [{
                'name': self.COLUMN_NAME,
                'type': self.COLUMN_TYPE,
                'sample': self.COLUMN_EXAMPLE
            }]
        }]
        self.patched_get_schema.return_value = self.default_schema_return_value

    def test_calls_refresh_of_all_data_sources(self):
        self.factory.data_source  # trigger creation
        with patch('redash.tasks.queries.refresh_schema.apply_async') as refresh_job:
            refresh_schemas()
            refresh_job.assert_called()

    def test_skips_paused_data_sources(self):
        self.factory.data_source.pause()

        with patch('redash.tasks.queries.refresh_schema.apply_async') as refresh_job:
            refresh_schemas()
            refresh_job.assert_not_called()

        self.factory.data_source.resume()

        with patch('redash.tasks.queries.refresh_schema.apply_async') as refresh_job:
            refresh_schemas()
            refresh_job.assert_called()

    def test_refresh_schema_creates_tables(self):
        EXPECTED_TABLE_METADATA = {
            'id': 1,
            'org_id': 1,
            'table_exists': True,
            'table_name': 'table',
            'sample_query': None,
            'table_description': None,
            'column_metadata': True,
            'data_source_id': 1
        }

        refresh_schema(self.factory.data_source.id)
        table_metadata = TableMetadata.query.all()
        column_metadata = ColumnMetadata.query.all()

        self.assertEqual(len(table_metadata), 1)
        self.assertEqual(len(column_metadata), 1)
        self.assertEqual(table_metadata[0].to_dict(), EXPECTED_TABLE_METADATA)
        self.assertEqual(column_metadata[0].to_dict(), self.EXPECTED_COLUMN_METADATA)

    def test_refresh_schema_deleted_table_marked(self):
        refresh_schema(self.factory.data_source.id)
        table_metadata = TableMetadata.query.all()
        column_metadata = ColumnMetadata.query.all()

        self.assertEqual(len(table_metadata), 1)
        self.assertEqual(len(column_metadata), 1)
        self.assertTrue(table_metadata[0].to_dict()['table_exists'])

        # Table is gone, `table_exists` should be False.
        self.patched_get_schema.return_value = []

        refresh_schema(self.factory.data_source.id)
        table_metadata = TableMetadata.query.all()
        column_metadata = ColumnMetadata.query.all()

        self.assertEqual(len(table_metadata), 1)
        self.assertEqual(len(column_metadata), 1)
        self.assertFalse(table_metadata[0].to_dict()['table_exists'])

        # Table is back, `table_exists` should be True again.
        self.patched_get_schema.return_value = self.default_schema_return_value
        refresh_schema(self.factory.data_source.id)
        table_metadata = TableMetadata.query.all()
        self.assertTrue(table_metadata[0].to_dict()['table_exists'])

    def test_refresh_schema_delete_column(self):
        NEW_COLUMN_NAME = 'new_column'
        refresh_schema(self.factory.data_source.id)
        column_metadata = ColumnMetadata.query.all()

        self.assertTrue(column_metadata[0].to_dict()['column_exists'])

        self.patched_get_schema.return_value = [{
            'name': 'table',
            'columns': [NEW_COLUMN_NAME],
            'metadata': [{
                'name': NEW_COLUMN_NAME,
                'type': self.COLUMN_TYPE,
                'sample': self.COLUMN_EXAMPLE
            }]
        }]

        refresh_schema(self.factory.data_source.id)
        column_metadata = ColumnMetadata.query.all()
        self.assertEqual(len(column_metadata), 2)

        self.assertFalse(column_metadata[1].to_dict()['column_exists'])
        self.assertTrue(column_metadata[0].to_dict()['column_exists'])

    def test_refresh_schema_update_column(self):
        UPDATED_COLUMN_TYPE = 'varchar'

        refresh_schema(self.factory.data_source.id)
        column_metadata = ColumnMetadata.query.all()
        self.assertEqual(column_metadata[0].to_dict(), self.EXPECTED_COLUMN_METADATA)

        updated_schema = copy.deepcopy(self.default_schema_return_value)
        updated_schema[0]['metadata'][0]['type'] = UPDATED_COLUMN_TYPE
        self.patched_get_schema.return_value = updated_schema

        refresh_schema(self.factory.data_source.id)
        column_metadata = ColumnMetadata.query.all()
        self.assertNotEqual(column_metadata[0].to_dict(), self.EXPECTED_COLUMN_METADATA)
        self.assertEqual(column_metadata[0].to_dict()['column_type'], UPDATED_COLUMN_TYPE)
