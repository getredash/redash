"""
Script to test concurrency (multithreading/multiprocess) issues with the workers. Use with caution.
"""
import json
import atfork
atfork.monkeypatch_os_fork_functions()
import atfork.stdlib_fixer
atfork.stdlib_fixer.fix_logging_module()

import time
from redash.data import worker
from redash import models, data_manager, redis_connection

if __name__ == '__main__':
    models.create_db(True, False)

    print "Creating data source..."
    data_source = models.DataSource.create(name="Concurrency", type="pg", options="dbname=postgres")

    print "Clear jobs/hashes:"
    redis_connection.delete("jobs")
    query_hashes = redis_connection.keys("query_hash_*")
    if query_hashes:
        redis_connection.delete(*query_hashes)

    starting_query_results_count = models.QueryResult.select().count()
    jobs_count = 5000
    workers_count = 10

    print "Creating jobs..."
    for i in xrange(jobs_count):
        query = "SELECT {}".format(i)
        print "Inserting: {}".format(query)
        data_manager.add_job(query=query, priority=worker.Job.LOW_PRIORITY,
                             data_source=data_source)

    print "Starting workers..."
    workers = data_manager.start_workers(workers_count)

    print "Waiting for jobs to be done..."
    keep_waiting = True
    while keep_waiting:
        results_count = models.QueryResult.select().count() - starting_query_results_count
        print "QueryResults: {}".format(results_count)
        time.sleep(5)
        if results_count == jobs_count:
            print "Yay done..."
            keep_waiting = False

    data_manager.stop_workers()

    qr_count = 0
    for qr in models.QueryResult.select():
        number = int(qr.query.split()[1])
        data_number = json.loads(qr.data)['rows'][0].values()[0]

        if number != data_number:
            print "Oops? {} != {} ({})".format(number, data_number, qr.id)
        qr_count += 1

    print "Verified {} query results.".format(qr_count)

    print "Done."