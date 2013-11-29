"""
CLI to start the workers.

TODO: move API server startup here.
"""
import argparse
import logging
import urlparse
import redis
import time
import settings
import data


def start_workers(data_manager):
    try:
        data_manager.start_workers(settings.WORKERS_COUNT, settings.CONNECTION_STRING,
                                   settings.MAX_CONNECTIONS)
        logging.info("Workers started.")

        while True:
            try:
                data_manager.refresh_queries()
            except Exception as e:
                logging.error("Something went wrong with refreshing queries...")
                logging.exception(e)
            time.sleep(60)
    except KeyboardInterrupt:
        logging.warning("Exiting; waiting for threads")
        data_manager.stop_workers()


if __name__ == '__main__':
    channel = logging.StreamHandler()
    logging.getLogger().addHandler(channel)
    # TODO: take logging level from configuration
    logging.getLogger().setLevel("DEBUG")

    parser = argparse.ArgumentParser()
    parser.add_argument("command")
    args = parser.parse_args()

    url = urlparse.urlparse(settings.REDIS_URL)
    redis_connection = redis.StrictRedis(host=url.hostname, port=url.port, db=0, password=url.password)
    data_manager = data.Manager(redis_connection, settings.INTERNAL_DB_CONNECTION_STRING, settings.MAX_CONNECTIONS)

    if args.command == "worker":
        start_workers(data_manager)
    else:
        print "Unknown command"

