---
title: Ongoing Maintenance and Basic Operations
sidebar:
  order: 3
---

:::note

**These instructions are not relevant for those who use our Docker based instances and should be updated.** We will appreciate your help with updating this guide.

:::

## Configuration and Logs

The supervisor config can be found in: `/etc/supervisor/conf.d/redash.conf` if you're using the new images that install Supervisor with a system packages. Otherwise, you can find it at `/opt/redash/supervisord/supervisord.conf`.

There, you can see the names of Redash's processes (`redash_celery`, `redash_server` and `redash_celery_scheduled`), as well as the location of their logs. If no logs location is present, then the logs will be written to `/var/logs/supervisor`.

## Restart

- Restart all processes: `sudo supervisorctl restart all`.
- Restart the Web server: `sudo supervisorctl restart redash_server`.
- Restart Celery workers: `sudo supervisorctl restart redash_celery`.

### Restarting Celery Workers & the Queries Queue

In case you are handling a problem, and you need to stop the currently running queries and reset the queue, follow the steps below.

1. Stop celery: `sudo supervisorctl stop redash_celery` (celery might take some time to stop, if it’s in the middle of running a query)
2. Flush redis: `redis-cli flushall`.
3. Start celery: `sudo supervisorctl start redash_celery`

## Changing the Number of Workers

By default, Celery will start a worker per CPU core. Because most of Redash’s tasks are IO bound, the real limit for number of workers you can use depends on the amount of memory your machine has. It’s recommended to increase number of workers, to support more concurrent queries.

1. Open the supervisord configuration file: `/opt/redash/supervisord/supervisord.conf`
2. Edit the `[program:redash_celery]` section and add to the _command_ value, the param “-c” with the number of concurrent workers you need.
3. Restart supervisord to apply new configuration: `sudo /etc/init.d/redash_supervisord restart`.

## DB

### Backup Redash’s DB:

Uncompressed backup: `sudo -u redash pg_dump > backup_filename.sql`

Compressed backup: `sudo -u redash pg_dump redash | gzip > backup_filename.gz`

## Version

See current version:

`bin/run ./manage.py version`

## Monitoring

Redash ships by default with a HTTP handler that gives you useful information about the health of your application. The endpoint is `/status.json` and requires a super admin API key to be given if you’re not already logged in. This API key can be obtained from the dedicated tab in your profile.

You’ll find below an example output of this endpoint:

```
{
  "dashboards_count": 30,
  "manager": {
    "last_refresh_at": "1465392784.433638",
    "outdated_queries_count": 1,
    "query_ids": "[34]",
    "queues": {
      "queries": {
        "data_sources": "Redshift data, redash metadata, MySQL data, MySQL read-only, Redshift read-only",
        "size": 1
      },
      "scheduled_queries": {
        "data_sources": "Redshift data, redash metadata, MySQL data, MySQL read-only, Redshift read-only",
        "size": 0
      }
    }
  },
  "queries_count": 204,
  "query_results_count": 11161,
  "redis_used_memory": "6.09M",
  "unused_query_results_count": 32,
  "version": "0.10.0+b1774",
  "widgets_count": 176,
  "workers": []
}

```

If you plan to hit this endpoint without being logged in, you’ll need to provide your API key as a query parameter. Example endpoint with an API key: `/status.json?api_key=fooBarqsLlGJQIs3maPErUxKuxwWGIpDXoSzQsx7xdv`
