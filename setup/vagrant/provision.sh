#!/usr/bin/env bash


cd /opt/redash/current
cp /opt/redash/.env /opt/redash/current
bower install

#install requirements
sudo pip install -r /opt/redash/current/requirements_dev.txt
sudo pip install -r /opt/redash/current/requirements.txt
sudo pip install pymongo==3.2.1

#update database
bin/run ./manage.py database drop_tables
pg_user_exists=0
sudo -u postgres psql postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='redash_reader'" | grep -q 1 || pg_user_exists=$?
if [ $pg_user_exists -eq 0 ]; then
    sudo -u postgres psql -c "DROP ROLE redash_reader"
fi

bin/run ./manage.py database create_tables
echo "Creating redash reader postgres user."
REDASH_READER_PASSWORD=$(pwgen -1)
sudo -u postgres psql -c "CREATE ROLE redash_reader WITH PASSWORD '$REDASH_READER_PASSWORD' NOCREATEROLE NOCREATEDB NOSUPERUSER LOGIN"
sudo -u postgres psql -c "grant select(id,name,type) ON data_sources to redash_reader;" redash
sudo -u postgres psql -c "grant select(id,name) ON users to redash_reader;" redash
sudo -u postgres psql -c "grant select on events, queries, dashboards, widgets, visualizations, query_results to redash_reader;" redash

sudo -u postgres bin/run ./manage.py ds new -n "re:dash metadata" -t "pg" -o "{\"user\": \"redash_reader\", \"password\": \"$REDASH_READER_PASSWORD\", \"host\": \"localhost\", \"dbname\": \"redash\"}"

bin/run ./manage.py users create --admin --password admin "Admin" "admin"

#Purge Redis cache
redis-cli -n 1 FLUSHALL

