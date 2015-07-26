Ongoing Maintanence and Basic Operations
########################################

Configuration and logs
======================

The supervisor config can be found in
``/opt/redash/supervisord/supervisord.conf``.

There you can see the names of its programs (``redash_celery``,
``redash_server``) and the location of their logs.

Restart
=======

Restarting the Web Server
-------------------------

``sudo supervisorctl stop redash_server``

Restarting Celery Workers
-------------------------

``sudo supervisorctl restart redash_celery``

Restarting Celery Workers & the Queries Queue
---------------------------------------------

In case you are handling a problem, and you need to stop the currently
running queries and reset the queue, follow the steps below.

1. Stop celery: ``sudo supervisorctl stop redash_celery`` (celery might
   take some time to stop, if it's in the middle of running a query)

2. Flush redis: ``redis-cli flushdb``

3. Start celery: ``sudo supervisorctl start redash_celery``

Changing the Number of Workers
==============================

By default, Celery will start a worker per CPU core. Because most of
re:dash's tasks are IO bound, the real limit for number of workers you
can use depends on the amount of memory your machine has. It's
recommended to increase number of workers, to support more concurrent
queries.

1. Open the supervisord configuration file:
   ``/opt/redash/supervisord/supervisord.conf``

2. Edit the ``[program:redash_celery]`` section and add to the *command*
   value, the param "-c" with the number of concurrent workers you need.

3. Restart supervisord to apply new configuration:
   ``sudo /etc/init.d/redash_supervisord restart``.

DB
==

Show the Currently Configured Data Source
-----------------------------------------

This varies based on the redash version and personal preferences. You
can do one of the following:

Using the CLI
~~~~~~~~~~~~~

In ``/opt/redash/current``, run:
``sudo -u redash bin/run ./manage.py ds list``

Using the Admin
~~~~~~~~~~~~~~~

(available from version 0.6b797). Browse to ``/admin/datasource``

View the Definition Directly in the DB
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

1. Open psql: ``sudo -u redash psql``

2. Run the query: ``SELECT  * from data_sources;``

Backup re:dash's DB:
--------------------

``sudo -u redash pg_dump > backup_filename.sql``

Version
=======

See current version:

``bin/run ./manage.py version``
