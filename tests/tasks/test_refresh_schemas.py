import copy
import datetime

from mock import patch
from tests import BaseTestCase

from redash import models, redis_connection, utils
from redash.tasks import refresh_schemas, refresh_schema, update_sample, refresh_samples
from redash.models import TableMetadata, ColumnMetadata
from redash.serializers import ColumnMetadataSerializer, TableMetadataSerializer


class TestRefreshSchemas(BaseTestCase):
    def setUp(self):
        super(TestRefreshSchemas, self).setUp()

        self.COLUMN_NAME = "first_column"
        self.COLUMN_TYPE = "text"
        self.COLUMN_EXAMPLE = "some text for column value"
        self.EXPECTED_COLUMN_METADATA = {
            "id": 1,
            "org_id": 1,
            "table_id": 1,
            "name": self.COLUMN_NAME,
            "type": self.COLUMN_TYPE,
            "example": self.COLUMN_EXAMPLE,
            "exists": True,
            "description": None,
        }

        get_schema_patcher = patch("redash.query_runner.pg.PostgreSQL.get_schema")
        self.patched_get_schema = get_schema_patcher.start()
        self.addCleanup(get_schema_patcher.stop)
        self.default_schema_return_value = [
            {
                "name": "table",
                "columns": [self.COLUMN_NAME],
                "metadata": [{"name": self.COLUMN_NAME, "type": self.COLUMN_TYPE,}],
            }
        ]
        self.patched_get_schema.return_value = self.default_schema_return_value

        get_table_sample_patcher = patch(
            "redash.query_runner.BaseQueryRunner.get_table_sample"
        )
        patched_get_table_sample = get_table_sample_patcher.start()
        self.addCleanup(get_table_sample_patcher.stop)
        patched_get_table_sample.return_value = {self.COLUMN_NAME: self.COLUMN_EXAMPLE}
        lock_key = "data_source:schema:refresh:{}:lock".format(
            self.factory.data_source.id
        )
        redis_connection.delete(lock_key)

    def tearDown(self):
        self.factory.data_source.query_runner.configuration["samples"] = False

    def test_calls_refresh_of_all_data_sources(self):
        self.factory.data_source  # trigger creation
        with patch(
            "redash.tasks.queries.maintenance.refresh_schema.delay"
        ) as refresh_job:
            refresh_schemas()
            refresh_job.assert_called()

    def test_skips_paused_data_sources(self):
        self.factory.data_source.pause()

        with patch(
            "redash.tasks.queries.maintenance.refresh_schema.delay"
        ) as refresh_job:
            refresh_schemas()
            refresh_job.assert_not_called()

        self.factory.data_source.resume()

        with patch(
            "redash.tasks.queries.maintenance.refresh_schema.delay"
        ) as refresh_job:
            refresh_schemas()
            refresh_job.assert_called()

    def test_refresh_schema_creates_tables(self):
        EXPECTED_TABLE_METADATA = {
            "id": 1,
            "org_id": 1,
            "exists": True,
            "name": u"table",
            "visible": True,
            "description": None,
            "column_metadata": True,
            "data_source_id": 1,
            "sample_updated_at": None,
            "sample_queries": {},
            "columns": [self.EXPECTED_COLUMN_METADATA],
        }

        refresh_schema(self.factory.data_source.id)
        update_sample(
            self.factory.data_source.id,
            "table",
            1,
            utils.utcnow() - datetime.timedelta(days=90),
        )
        table_metadata = TableMetadata.query.all()
        column_metadata = ColumnMetadata.query.all()

        self.assertEqual(len(table_metadata), 1)
        self.assertEqual(len(column_metadata), 1)
        self.assertEqual(
            TableMetadataSerializer(
                table_metadata[0], with_favorite_state=False
            ).serialize(),
            EXPECTED_TABLE_METADATA,
        )
        self.assertEqual(
            ColumnMetadataSerializer(column_metadata[0]).serialize(),
            self.EXPECTED_COLUMN_METADATA,
        )

    def test_refresh_schema_deleted_table_marked(self):
        refresh_schema(self.factory.data_source.id)
        table_metadata = TableMetadata.query.all()
        column_metadata = ColumnMetadata.query.all()

        self.assertEqual(len(table_metadata), 1)
        self.assertEqual(len(column_metadata), 1)
        self.assertTrue(
            TableMetadataSerializer(
                table_metadata[0], with_favorite_state=False
            ).serialize()["exists"]
        )

        # Table is gone, `exists` should be False.
        self.patched_get_schema.return_value = []

        refresh_schema(self.factory.data_source.id)
        table_metadata = TableMetadata.query.all()
        column_metadata = ColumnMetadata.query.all()

        self.assertEqual(len(table_metadata), 1)
        self.assertEqual(len(column_metadata), 1)
        self.assertFalse(
            TableMetadataSerializer(
                table_metadata[0], with_favorite_state=False
            ).serialize()["exists"]
        )

        # Table is back, `exists` should be True again.
        self.patched_get_schema.return_value = self.default_schema_return_value
        refresh_schema(self.factory.data_source.id)
        table_metadata = TableMetadata.query.all()
        self.assertTrue(
            TableMetadataSerializer(
                table_metadata[0], with_favorite_state=False
            ).serialize()["exists"]
        )

    def test_refresh_schema_table_with_new_metadata_updated(self):
        refresh_schema(self.factory.data_source.id)
        table_metadata = TableMetadata.query.all()
        column_metadata = ColumnMetadata.query.all()

        self.assertEqual(len(table_metadata), 1)
        self.assertEqual(len(column_metadata), 1)
        self.assertTrue(
            TableMetadataSerializer(
                table_metadata[0], with_favorite_state=False
            ).serialize()["column_metadata"]
        )

        # Table has no metdata field, `column_metadata` should be False.
        self.patched_get_schema.return_value = [
            {"name": "table", "columns": [self.COLUMN_NAME],}
        ]

        refresh_schema(self.factory.data_source.id)
        table_metadata = TableMetadata.query.all()
        column_metadata = ColumnMetadata.query.all()

        self.assertEqual(len(table_metadata), 1)
        self.assertEqual(len(column_metadata), 1)
        self.assertFalse(
            TableMetadataSerializer(
                table_metadata[0], with_favorite_state=False
            ).serialize()["column_metadata"]
        )

        # Table metadata field is back, `column_metadata` should be True again.
        self.patched_get_schema.return_value = self.default_schema_return_value
        refresh_schema(self.factory.data_source.id)
        table_metadata = TableMetadata.query.all()
        self.assertTrue(
            TableMetadataSerializer(
                table_metadata[0], with_favorite_state=False
            ).serialize()["column_metadata"]
        )

    def test_refresh_schema_delete_column(self):
        NEW_COLUMN_NAME = "new_column"
        refresh_schema(self.factory.data_source.id)
        column_metadata = ColumnMetadata.query.all()

        self.assertTrue(
            ColumnMetadataSerializer(column_metadata[0]).serialize()["exists"]
        )

        self.patched_get_schema.return_value = [
            {
                "name": "table",
                "columns": [NEW_COLUMN_NAME],
                "metadata": [{"name": NEW_COLUMN_NAME, "type": self.COLUMN_TYPE,}],
            }
        ]

        refresh_schema(self.factory.data_source.id)
        column_metadata = ColumnMetadata.query.all()
        self.assertEqual(len(column_metadata), 2)

        self.assertFalse(
            ColumnMetadataSerializer(column_metadata[1]).serialize()["exists"]
        )
        self.assertTrue(
            ColumnMetadataSerializer(column_metadata[0]).serialize()["exists"]
        )

    def test_refresh_schema_update_column(self):
        UPDATED_COLUMN_TYPE = "varchar"

        refresh_schema(self.factory.data_source.id)
        update_sample(
            self.factory.data_source.id,
            "table",
            1,
            utils.utcnow() - datetime.timedelta(days=90),
        )
        column_metadata = ColumnMetadata.query.all()
        self.assertEqual(
            ColumnMetadataSerializer(column_metadata[0]).serialize(),
            self.EXPECTED_COLUMN_METADATA,
        )

        updated_schema = copy.deepcopy(self.default_schema_return_value)
        updated_schema[0]["metadata"][0]["type"] = UPDATED_COLUMN_TYPE
        self.patched_get_schema.return_value = updated_schema

        refresh_schema(self.factory.data_source.id)
        column_metadata = ColumnMetadata.query.all()
        self.assertNotEqual(
            ColumnMetadataSerializer(column_metadata[0]).serialize(),
            self.EXPECTED_COLUMN_METADATA,
        )
        self.assertEqual(
            ColumnMetadataSerializer(column_metadata[0]).serialize()["type"],
            UPDATED_COLUMN_TYPE,
        )

    def test_refresh_samples_rate_limits(self):
        NEW_COLUMN_NAME = "new_column"
        NUM_TABLES = 105
        tables = []

        for i in range(NUM_TABLES):
            tables.append(
                {
                    "name": "table{}".format(i),
                    "columns": [NEW_COLUMN_NAME],
                    "metadata": [{"name": NEW_COLUMN_NAME, "type": self.COLUMN_TYPE,}],
                }
            )

        self.patched_get_schema.return_value = tables
        self.factory.data_source.query_runner.configuration["samples"] = True

        refresh_schema(self.factory.data_source.id)
        refresh_samples(self.factory.data_source.id, 50)

        # There's a total of 105 tables
        table_metadata = TableMetadata.query.count()
        self.assertEqual(table_metadata, NUM_TABLES)

        # 50 tables are processed on the first call
        table_metadata = TableMetadata.query.filter(
            TableMetadata.sample_updated_at.is_(None)
        ).all()
        self.assertEqual(len(table_metadata), 55)

        # 50 more tables are processed on the second call
        refresh_samples(self.factory.data_source.id, 50)
        table_metadata = TableMetadata.query.filter(
            TableMetadata.sample_updated_at.is_(None)
        ).all()
        self.assertEqual(len(table_metadata), 5)

        # All tables are processed by the third call
        refresh_samples(self.factory.data_source.id, 50)
        table_metadata = TableMetadata.query.filter(
            TableMetadata.sample_updated_at.is_(None)
        ).all()
        self.assertEqual(len(table_metadata), 0)

    def test_refresh_samples_refreshes(self):
        NEW_COLUMN_NAME = "new_column"
        NUM_TABLES = 5
        TIME_BEFORE_UPDATE = utils.utcnow()
        tables = []

        for i in range(NUM_TABLES):
            tables.append(
                {
                    "name": "table{}".format(i),
                    "columns": [NEW_COLUMN_NAME],
                    "metadata": [{"name": NEW_COLUMN_NAME, "type": self.COLUMN_TYPE,}],
                }
            )

        self.patched_get_schema.return_value = tables
        self.factory.data_source.query_runner.configuration["samples"] = True

        refresh_schema(self.factory.data_source.id)
        refresh_samples(self.factory.data_source.id, 50)

        # There's a total of 5 processed tables
        table_metadata = TableMetadata.query.filter(
            TableMetadata.sample_updated_at.isnot(None)
        )
        self.assertEqual(table_metadata.count(), NUM_TABLES)
        self.assertTrue(table_metadata.first().sample_updated_at > TIME_BEFORE_UPDATE)

        table_metadata.update(
            {"sample_updated_at": utils.utcnow() - datetime.timedelta(days=30)}
        )
        models.db.session.commit()

        TIME_BEFORE_UPDATE = utils.utcnow()
        refresh_samples(self.factory.data_source.id, 50)
        table_metadata_list = TableMetadata.query.filter(
            TableMetadata.sample_updated_at.isnot(None)
        )
        self.assertTrue(
            table_metadata_list.first().sample_updated_at > TIME_BEFORE_UPDATE
        )

    def test_refresh_schema_doesnt_overwrite_samples(self):
        self.factory.data_source.query_runner.configuration["samples"] = True

        refresh_schema(self.factory.data_source.id)
        column_metadata = ColumnMetadata.query.first()
        self.assertEqual(column_metadata.example, None)

        update_sample(
            self.factory.data_source.id,
            "table",
            1,
            utils.utcnow() - datetime.timedelta(days=90),
        )
        column_metadata = ColumnMetadata.query.first()
        self.assertEqual(column_metadata.example, self.COLUMN_EXAMPLE)

        # Check that a schema refresh doesn't overwrite examples
        refresh_schema(self.factory.data_source.id)
        column_metadata = ColumnMetadata.query.first()
        self.assertEqual(column_metadata.example, self.COLUMN_EXAMPLE)

    def test_refresh_samples_applied_to_one_data_source(self):
        ds1 = self.factory.create_data_source()
        ds2 = self.factory.create_data_source()

        ds1.query_runner.configuration["samples"] = True
        ds2.query_runner.configuration["samples"] = True

        refresh_schema(ds1.id)
        refresh_schema(ds2.id)
        refresh_samples(ds1.id, 50)

        table_metadata = TableMetadata.query.filter(
            TableMetadata.sample_updated_at.isnot(None)
        )
        self.assertEqual(table_metadata.count(), len(self.default_schema_return_value))
