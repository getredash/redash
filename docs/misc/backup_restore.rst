How To: Backup your re:dash database and restore it on a different server
=================

**Note:** This guide assumes that the default database name (redash) has not been changed.

1. Check the size of your redash database. This can be done by creating a query within redash itself against the 're:dash metadata' data source.

.. code::

    select t1.datname AS db_name, pg_size_pretty(pg_database_size(t1.datname)) as db_size
    from pg_database t1
    where t1.datname = 'redash'


2. Check the amount of available disk space on your existing server.

.. code::

    df -hT


3. Backup the existing redash database.

.. code::

    sudo -u redash pg_dump redash | gzip > redash_backup.gz


4. Transfer the backup to the new server.

5. `Perform a clean install of re:dash <http://docs.redash.io/en/latest/setup.html>`__ on the new server.

6. Check the amount of available disk space on the new server.

.. code::

    df -hT


7. Login as postgres user on the new server.

.. code::

    sudo -u postgres -i


8. drop the current redash database, create a new database named redash, and then restore the backup into the new database.

.. code::

    dropdb redash
    createdb -T template0 redash
    gunzip -c redash_backup.gz | psql redash


9. Set a new password of your choosing for the 'redash_reader' user (since the new installation generated a random password).

.. code::

    psql -c "ALTER ROLE redash_reader WITH PASSWORD 'yourpasswordgoeshere';"


**Note:** Then you must navigate to the 're:dash metadata' data source (/data_sources/1) in the new re:dash installation and change the password to match the one entered above.

10. Grant permissions on the redash database to the redash_reader user.

.. code::

    psql -c "grant select(id,name,type) ON data_sources to redash_reader;" redash
    psql -c "grant select(id,name) ON users to redash_reader;" redash
    psql -c "grant select on events, queries, dashboards, widgets, visualizations, query_results to redash_reader;" redash


Create a new query in redash (using re:dash metadata as the data source) to test that everything is working as expected.
