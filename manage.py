#!/usr/bin/env python
"""
CLI to manage redash.
"""
import atfork
atfork.monkeypatch_os_fork_functions()
import atfork.stdlib_fixer
atfork.stdlib_fixer.fix_logging_module()

import argparse
import logging
import time
from redash import settings, app, data_manager


def start_workers():
    try:
        old_workers = data_manager.redis_connection.smembers('workers')
        data_manager.redis_connection.delete('workers')

        logging.info("Cleaning old workers: %s", old_workers)

        data_manager.start_workers(settings.WORKERS_COUNT, settings.CONNECTION_ADAPTER, settings.CONNECTION_STRING)
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


def start_server(port, debug):
    app.run(debug=debug, port=port)


def create_db(create_tables, drop_tables):
    from redash.models import create_db

    create_db(create_tables, drop_tables)


if __name__ == '__main__':
    channel = logging.StreamHandler()
    logging.getLogger().addHandler(channel)
    logging.getLogger().setLevel(settings.LOG_LEVEL)

    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(title='command', dest='command')

    subparsers.add_parser('worker', help='start query execution workers')
    server_parser = subparsers.add_parser('server', help='start api server')
    server_parser.add_argument('--debug',
                               action='store_true',
                               help='start in debug mode (code reload)')
    server_parser.add_argument('--port',
                               default=8888,
                               help='port to bind to')
    db_parser = subparsers.add_parser('db', help='database operations')
    db_parser.add_argument('--create-tables',
                           action='store_true',
                           help='Create all tables')
    db_parser.add_argument('--drop-tables',
                           action='store_true',
                           help='Drop all tables')

    args = parser.parse_args()

    if args.command == "worker":
        start_workers()
    elif args.command == 'db':
        create_db(args.create_tables, args.drop_tables)
    elif args.command == 'server':
        start_server(args.port, args.debug)