#!/usr/bin/env python

from ConfigParser import ConfigParser
import os
import argparse
import sys

LIST_OPTS = [
    'enabled_query_runners',
    'enabled_destinations'
]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('-c','--config', default='/etc/redash.cfg')
    parser.add_argument('-p','--installpath', default='/opt/redash')
    parser.add_argument('-v','--virtualenv', default='/opt/redash/venv')
    parser.add_argument('command',
                    choices=['manage','api','worker','scheduler'])
    parser.add_argument('arguments', nargs='*')
    args = parser.parse_args()
    conf = ConfigParser()
    conf.readfp(open(args.config))

    paths = os.environ['PATH']
    os.environ['PATH'] = '%s/bin/:%s/bin/:%s' % (args.installpath,
            args.virtualenv, paths)

    os.chdir(args.installpath)
    for opt in conf.options('config'):
        if opt not in LIST_OPTS:
            val = conf.get('config', opt)
            if val:
                os.environ['REDASH_%s' % opt.upper()] = val

    for opt in LIST_OPTS:
        os.environ['REDASH_%s' % opt.upper()] = ','.join(
            conf.get('config', opt).split()
        )

    for section in conf.sections():
        if section in ['config', 'daemon']:
            continue

        for opt in conf.options(section):
            val = conf.get(section, opt).strip()
            if val:
                os.environ['REDASH_%s' % opt.upper()] = val

    command = args.command

    listen_address = conf.get('daemon','http_address')
    workers = conf.get('daemon', 'http_workers')
    max_requests = conf.get('daemon', 'http_max_requests')
    concurrency = conf.get('daemon','celery_concurrency')
    tasks_per_child = conf.get('daemon','celery_tasks_per_child')

    cmd = []
    if command == 'manage':
        cmd = ['./manage.py']
    elif command == 'api':
        cmd = ['gunicorn','-b',listen_address,
                '--name','redash','-w', workers ,'--max-requests',
                max_requests, 'redash.wsgi:app']
    elif command == 'worker':
        cmd = ['celery', 'worker', '--app=redash.worker', '--beat',
                '-c%s' % concurrency, '-Qqueries,celery', 
                '--maxtasksperchild=%s' % tasks_per_child, '-Ofair']
    elif command == 'scheduler':
        cmd = ['celery','worker','--app=redash.worker','-c%s' % concurrency,
                '-Qscheduled_queries', 
                '--maxtasksperchild=%s' % tasks_per_child, '-Ofair']
    else:
        raise ValueError(command)

    if cmd:
        os.system(' '.join(cmd + args.arguments))

if __name__ == '__main__':
    main()
