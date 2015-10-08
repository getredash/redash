#!/bin/bash
# Create database / tables
pg_user_exists=0
psql --host=postgres --username=postgres postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='redash'" | grep -q 1 || pg_user_exists=$?
if [ $pg_user_exists -ne 0 ]; then
    echo "Creating redash postgres user & database."
     createuser redash --username=postgres --host=postgres --no-superuser --no-createdb --no-createrole
     createdb redash --username=postgres --host=postgres --owner=redash

    cd /opt/redash/current
    sudo -u redash bin/run ./manage.py database create_tables
fi

# Create default admin user
cd /opt/redash/current
# TODO: make sure user created only once
# TODO: generate temp password and print to screen
sudo -u redash bin/run ./manage.py users create --admin --password admin "Admin" "admin"

# Create re:dash read only pg user & setup data source
pg_user_exists=0
psql --host=postgres --username=postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='redash_reader'" | grep -q 1 || pg_user_exists=$?
if [ $pg_user_exists -ne 0 ]; then
    echo "Creating redash reader postgres user."
    REDASH_READER_PASSWORD=$(pwgen -1)
    psql --host=postgres --username=postgres -c "CREATE ROLE redash_reader WITH PASSWORD '$REDASH_READER_PASSWORD' NOCREATEROLE NOCREATEDB NOSUPERUSER LOGIN"
    psql --host=postgres --username=postgres -c "grant select(id,name,type) ON data_sources to redash_reader;" redash
    psql --host=postgres --username=postgres -c "grant select(id,name) ON users to redash_reader;" redash
    psql --host=postgres --username=postgres -c "grant select on activity_log, events, queries, dashboards, widgets, visualizations, query_results to redash_reader;" redash

    cd /opt/redash/current
    sudo -u redash bin/run ./manage.py ds new -n "re:dash metadata" -t "pg" -o "{\"user\": \"redash_reader\", \"password\": \"$REDASH_READER_PASSWORD\", \"host\": \"localhost\", \"dbname\": \"redash\"}"
fi
