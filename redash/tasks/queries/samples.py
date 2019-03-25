import datetime
import time

from redash import models, settings, utils
from redash.query_runner import NotSupported
from redash.worker import get_job_logger, job
from sqlalchemy import or_
from sqlalchemy.orm import load_only

logger = get_job_logger(__name__)


def truncate_long_string(original_str, max_length):
    # Remove null characters so we can save as string to postgres
    new_str = original_str.replace("\x00", "")

    if new_str and len(new_str) > max_length:
        new_str = "{}...".format(new_str[:max_length])
    return new_str


@job(settings.SCHEMAS_REFRESH_QUEUE, timeout=settings.SCHEMA_SAMPLE_UPDATE_TIMEOUT)
def update_sample(data_source_id, table_name, table_id, sample_updated_at):
    """
    For a given table, look up a sample row for it and update
    the "example" fields for it in the column_metadata table.
    """
    logger.info(u"task=update_sample state=start table_name=%s", table_name)
    start_time = time.time()
    ds = models.DataSource.get_by_id(data_source_id)

    persisted_columns = models.ColumnMetadata.query.filter(
        models.ColumnMetadata.exists.is_(True),
        models.ColumnMetadata.table_id == table_id,
    ).options(load_only("id", "name", "example"))

    update_threshold = utils.utcnow() - datetime.timedelta(
        days=settings.SCHEMA_SAMPLE_UPDATE_FREQUENCY_DAYS
    )

    first_column = persisted_columns.first()

    if (
        first_column
        and sample_updated_at
        and first_column.example
        and sample_updated_at > update_threshold
    ):
        # Look at the first example in the persisted columns.
        # If this is *not* empty AND sample_updated_at is recent, don't update sample
        logger.info(
            u"task=update_sample state=abort - recent sample exists table_name=%s",
            table_name,
        )
        return

    sample = None
    try:
        sample = ds.query_runner.get_table_sample(table_name)
    except NotSupported:
        logger.info(u"Unable to fetch samples for {}".format(table_name))

    if not sample:
        return

    #  If a column exists, add a sample to it.
    for persisted_column in persisted_columns.all():
        column_example = sample.get(persisted_column.name, None)
        column_example = (
            column_example if isinstance(column_example, str) else str(column_example)
        )  # noqa: F821
        persisted_column.example = truncate_long_string(column_example, 4000)
        models.db.session.add(persisted_column)

    models.db.session.commit()
    logger.info(
        u"task=update_sample state=finished table_name=%s runtime=%.2f",
        table_name,
        time.time() - start_time,
    )
    return sample


@job(settings.SCHEMAS_REFRESH_QUEUE, timeout=settings.SCHEMA_REFRESH_TIME_LIMIT)
def refresh_samples(data_source_id, table_sample_limit):
    """
    For a given data source, refresh the data samples stored for each
    table. This is done for tables with no samples or samples older
    than DAYS_AGO
    """
    logger.info(u"task=refresh_samples state=start ds_id=%s", data_source_id)
    ds = models.DataSource.get_by_id(data_source_id)

    if not ds.query_runner.configuration.get("samples", False):
        return

    DAYS_AGO = utils.utcnow() - datetime.timedelta(
        days=settings.SCHEMA_SAMPLE_REFRESH_FREQUENCY_DAYS
    )

    # Find all existing tables that have an empty or old sample_updated_at
    tables_to_sample = (
        models.TableMetadata.query.filter(
            models.TableMetadata.exists.is_(True),
            models.TableMetadata.data_source_id == data_source_id,
            or_(
                models.TableMetadata.sample_updated_at.is_(None),
                models.TableMetadata.sample_updated_at < DAYS_AGO,
            ),
        )
        .limit(table_sample_limit)
        .all()
    )

    tasks = []
    for table in tables_to_sample:
        tasks.append((ds.id, table.name, table.id, table.sample_updated_at))
        table.sample_updated_at = models.db.func.now()
        models.db.session.add(table)
    models.db.session.commit()

    for task_args in tasks:
        update_sample.delay(*task_args)


def cleanup_schema_metadata():
    models.cleanup_data_in_table(models.TableMetadata)
    models.cleanup_data_in_table(models.ColumnMetadata)
