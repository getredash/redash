import logging
import time

from rq.timeouts import JobTimeoutException
from redash import models, redis_connection, settings, statsd_client
from redash.models.parameterized_query import (
    InvalidParameterError,
    QueryDetachedFromDataSourceError,
)
from redash.tasks.failure_report import track_failure
from redash.tasks.queries.samples import refresh_samples
from redash.utils import json_dumps, sentry
from redash.worker import get_job_logger, job
from redash.monitor import rq_job_ids

from .execution import enqueue_query
from .samples import truncate_long_string

logger = get_job_logger(__name__)


def empty_schedules():
    logger.info("Deleting schedules of past scheduled queries...")

    queries = models.Query.past_scheduled_queries()
    for query in queries:
        query.schedule = None
    models.db.session.commit()

    logger.info("Deleted %d schedules.", len(queries))


def _should_refresh_query(query):
    if settings.FEATURE_DISABLE_REFRESH_QUERIES:
        logger.info("Disabled refresh queries.")
        return False
    elif query.org.is_disabled:
        logger.debug("Skipping refresh of %s because org is disabled.", query.id)
        return False
    elif query.data_source is None:
        logger.debug("Skipping refresh of %s because the datasource is none.", query.id)
        return False
    elif query.data_source.paused:
        logger.debug(
            "Skipping refresh of %s because datasource - %s is paused (%s).",
            query.id,
            query.data_source.name,
            query.data_source.pause_reason,
        )
        return False
    else:
        return True


def _apply_default_parameters(query):
    parameters = {p["name"]: p.get("value") for p in query.parameters}
    if any(parameters):
        try:
            return query.parameterized.apply(parameters).query
        except InvalidParameterError as e:
            error = u"Skipping refresh of {} because of invalid parameters: {}".format(
                query.id, str(e)
            )
            track_failure(query, error)
            raise
        except QueryDetachedFromDataSourceError as e:
            error = (
                "Skipping refresh of {} because a related dropdown "
                "query ({}) is unattached to any datasource."
            ).format(query.id, e.query_id)
            track_failure(query, error)
            raise
    else:
        return query.query_text


class RefreshQueriesError(Exception):
    pass


def refresh_queries():
    logger.info("Refreshing queries...")
    enqueued = []
    for query in models.Query.outdated_queries():
        if not _should_refresh_query(query):
            continue

        try:
            enqueue_query(
                _apply_default_parameters(query),
                query.data_source,
                query.user_id,
                scheduled_query=query,
                metadata={"Query ID": query.id, "Username": "Scheduled"},
            )
            enqueued.append(query)
        except Exception as e:
            message = "Could not enqueue query %d due to %s" % (query.id, repr(e))
            logging.info(message)
            error = RefreshQueriesError(message).with_traceback(e.__traceback__)
            sentry.capture_exception(error)

    status = {
        "outdated_queries_count": len(enqueued),
        "last_refresh_at": time.time(),
        "query_ids": json_dumps([q.id for q in enqueued]),
    }

    redis_connection.hmset("redash:status", status)
    logger.info("Done refreshing queries: %s" % status)


def cleanup_query_results():
    """
    Job to cleanup unused query results -- such that no query links to them anymore, and older than
    settings.QUERY_RESULTS_MAX_AGE (a week by default, so it's less likely to be open in someone's browser and be used).

    Each time the job deletes only settings.QUERY_RESULTS_CLEANUP_COUNT (100 by default) query results so it won't choke
    the database in case of many such results.
    """

    logger.info(
        "Running query results clean up (removing maximum of %d unused results, that are %d days old or more)",
        settings.QUERY_RESULTS_CLEANUP_COUNT,
        settings.QUERY_RESULTS_CLEANUP_MAX_AGE,
    )

    unused_query_results = models.QueryResult.unused(
        settings.QUERY_RESULTS_CLEANUP_MAX_AGE
    )
    deleted_count = models.QueryResult.query.filter(
        models.QueryResult.id.in_(
            unused_query_results.limit(settings.QUERY_RESULTS_CLEANUP_COUNT).subquery()
        )
    ).delete(synchronize_session=False)
    models.db.session.commit()
    logger.info("Deleted %d unused query results.", deleted_count)


def remove_ghost_locks():
    """
    Removes query locks that reference a non existing RQ job.
    """
    keys = redis_connection.keys("query_hash_job:*")
    locks = {k: redis_connection.get(k) for k in keys}
    jobs = list(rq_job_ids())

    count = 0

    for lock, job_id in locks.items():
        if job_id not in jobs:
            redis_connection.delete(lock)
            count += 1

    logger.info("Locks found: {}, Locks removed: {}".format(len(locks), count))


@job(settings.SCHEMAS_REFRESH_QUEUE, timeout=settings.SCHEMA_REFRESH_TIME_LIMIT)
def refresh_schema(data_source_id, max_type_string_length=250):
    ds = models.DataSource.get_by_id(data_source_id)
    logger.info("task=refresh_schema state=start ds_id=%s", ds.id)
    lock_key = "data_source:schema:refresh:{}:lock".format(data_source_id)
    lock = redis_connection.lock(lock_key, timeout=settings.SCHEMA_REFRESH_TIME_LIMIT)
    acquired = lock.acquire(blocking=False)
    start_time = time.time()

    if acquired:
        logger.info("task=refresh_schema state=locked ds_id=%s", ds.id)
        try:
            # Stores data from the updated schema that tells us which
            # columns and which tables currently exist
            existing_tables_set = set()
            existing_columns_set = set()

            # Stores data that will be inserted into postgres
            table_data = {}
            column_data = {}

            new_column_names = {}
            new_column_metadata = {}

            for table in ds.query_runner.get_schema(get_stats=True):
                table_name = table["name"]
                existing_tables_set.add(table_name)

                table_data[table_name] = {
                    "org_id": ds.org_id,
                    "name": table_name,
                    "data_source_id": ds.id,
                    "column_metadata": "metadata" in table,
                    "exists": True,
                }
                new_column_names[table_name] = table["columns"]
                new_column_metadata[table_name] = table.get("metadata", None)

            models.TableMetadata.store(ds, existing_tables_set, table_data)

            all_existing_persisted_tables = models.TableMetadata.query.filter(
                models.TableMetadata.exists.is_(True),
                models.TableMetadata.data_source_id == ds.id,
            ).all()

            for table in all_existing_persisted_tables:
                for i, column in enumerate(new_column_names.get(table.name, [])):
                    existing_columns_set.add(column)
                    column_data[column] = {
                        "org_id": ds.org_id,
                        "table_id": table.id,
                        "name": column,
                        "type": None,
                        "exists": True,
                    }

                    if table.column_metadata:
                        column_type = new_column_metadata[table.name][i]["type"]
                        column_type = truncate_long_string(
                            column_type, max_type_string_length
                        )
                        column_data[column]["type"] = column_type

                models.ColumnMetadata.store(table, existing_columns_set, column_data)

                existing_columns_list = list(existing_columns_set)

                # If a column did not exist, set the 'column_exists' flag to false.
                models.ColumnMetadata.query.filter(
                    models.ColumnMetadata.exists.is_(True),
                    models.ColumnMetadata.table_id == table.id,
                    ~models.ColumnMetadata.name.in_(existing_columns_list),
                ).update(
                    {"exists": False, "updated_at": models.db.func.now()},
                    synchronize_session="fetch",
                )

                # Clear the set for the next round
                existing_columns_set.clear()

            # If a table did not exist in the get_schema() response above,
            # set the 'exists' flag to false.
            existing_tables_list = list(existing_tables_set)
            models.TableMetadata.query.filter(
                models.TableMetadata.exists.is_(True),
                models.TableMetadata.data_source_id == ds.id,
                ~models.TableMetadata.name.in_(existing_tables_list),
            ).update(
                {"exists": False, "updated_at": models.db.func.now()},
                synchronize_session="fetch",
            )

            models.db.session.commit()

            logger.info("task=refresh_schema state=caching ds_id=%s", ds.id)
            ds.schema_cache.populate(forced=True)
            logger.info("task=refresh_schema state=cached ds_id=%s", ds.id)

            logger.info(
                "task=refresh_schema state=finished ds_id=%s runtime=%.2f",
                ds.id,
                time.time() - start_time,
            )
            statsd_client.incr("refresh_schema.success")
        except JobTimeoutException:
            logger.info(
                "task=refresh_schema state=timeout ds_id=%s runtime=%.2f",
                ds.id,
                time.time() - start_time,
            )
            statsd_client.incr("refresh_schema.timeout")
        except Exception:
            logger.warning(
                "Failed refreshing schema for the data source: %s", ds.name, exc_info=1
            )
            statsd_client.incr("refresh_schema.error")
            logger.info(
                "task=refresh_schema state=failed ds_id=%s runtime=%.2f",
                ds.id,
                time.time() - start_time,
            )
        finally:
            lock.release()
            logger.info("task=refresh_schema state=unlocked ds_id=%s", ds.id)
    else:
        logger.info("task=refresh_schema state=alreadylocked ds_id=%s", ds.id)


def refresh_schemas():
    """
    Refreshes the data sources schemas.
    """
    blacklist = [
        int(ds_id)
        for ds_id in redis_connection.smembers("data_sources:schema:blacklist")
        if ds_id
    ]
    global_start_time = time.time()

    logger.info(u"task=refresh_schemas state=start")

    for ds in models.DataSource.query:
        if ds.paused:
            logger.info(
                u"task=refresh_schema state=skip ds_id=%s reason=paused(%s)",
                ds.id,
                ds.pause_reason,
            )
        elif ds.id in blacklist:
            logger.info(
                u"task=refresh_schema state=skip ds_id=%s reason=blacklist", ds.id
            )
        elif ds.org.is_disabled:
            logger.info(
                u"task=refresh_schema state=skip ds_id=%s reason=org_disabled", ds.id
            )
        else:
            refresh_schema.delay(ds.id)
            refresh_samples.delay(ds.id, table_sample_limit=50)

    logger.info(
        u"task=refresh_schemas state=finish total_runtime=%.2f",
        time.time() - global_start_time,
    )
