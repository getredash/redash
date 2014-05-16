import time
import datetime
from celery.utils.log import get_task_logger
from data.query_runner import get_query_runner
from redash import celery, redis_connection, models, statsd_client
from utils import gen_query_hash

logger = get_task_logger(__name__)


@celery.task(bind=True, track_started=True)
def execute_query(self, query, data_source_id):
    # TODO: maye this should be a class?
    start_time = time.time()

    logger.info("Loading data source (%d)...", data_source_id)

    # TODO: we should probably cache data sources in Redis
    data_source = models.DataSource.get_by_id(data_source_id)

    self.update_state(state='STARTED', meta={'start_time': start_time, 'custom_message': ''})

    logger.info("Executing query:\n%s", query)

    query_hash = gen_query_hash(query)
    query_runner = get_query_runner(data_source.type, data_source.options)

    if getattr(query_runner, 'annotate_query', True):
        # TODO: anotate with queu ename
        annotated_query = "/* Task Id: %s, Query hash: %s */ %s" % \
                          (self.request.id, query_hash, query)
    else:
        annotated_query = query

    with statsd_client.timer('query_runner.{}.{}.run_time'.format(data_source.type, data_source.name)):
        data, error = query_runner(annotated_query)

    run_time = time.time() - start_time
    logger.info("Query finished... data length=%s, error=%s", data and len(data), error)

    self.update_state(state='STARTED', meta={'start_time': start_time, 'error': error, 'custom_message': ''})

    # TODO: it is possible that storing the data will fail, and we will need to retry
    # while we already marked the job as done
    # Delete query_hash
    redis_connection.delete('query_hash_job:%s', query_hash)

    if not error:
        query_result = models.QueryResult.store_result(data_source.id, query_hash, query, data, run_time, datetime.datetime.utcnow())
    else:
        raise Exception(error)

    return query_result.id

