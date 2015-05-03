---
title: Ongoing Maintanence and Basic Operations
layout: post
category: deployment
permalink: /deployment/maintenance.html
---

## Configuration and logs

The supervisor config can be found in `/opt/redash/supervisord/supervisord.conf`.

There you can see the names of its programs (`redash_celery`, `redash_server`) and the location of their logs.

## Restart

### Restarting Celery workers

In case you are handling a problem, and you need to stop the currently running queries, follow the steps below.
In simpler cases, like upgrades, just use `sudo supervisorctl restart redash_celery`.

1. Stop celery:

`sudo supervisorctl stop redash_celery`

(celery might take some time to stop, if it's in the middle of running a query)

2. Flush redis 

`redis-cli`

`127.0.0.1:6379>flushdb`

3. Start celery:

`sudo supervisorctl start redash_celery`

### Restarting the web client

`sudo supervisorctl stop redash_server`

## Chaninging the number of workers

1. Open the supervisord configuration file 

`/opt/redash/supervisord/supervisord.conf`

2. Edit the `[program:redash_celery]` section and add to the command value, the param "-c" with the number of concurrent workers you need. 
The limit here is memory so 6 or 8 are safe values, depends on the instance size.

3. Restart 

`sudo /etc/init.d/redash_supervisord restart`

## DB

### See the currently configured data source

This varies based on the redash version and personal preferences. 
You can do one of the following:

#### Using command line

In `/opt/redash/current`, run: `bin/run ./manage.py ds list`

#### Using the admin

Browse to `/admin/datasource`

#### view the definition directly in the DB

`sudo -u redash psql`

`redash=> select * from data_sources;`

### Backup redash's DB:

`sudo -u redash pg_dump > backup_filename.sql`
