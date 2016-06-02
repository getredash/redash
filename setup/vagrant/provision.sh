#!/usr/bin/env bash


cd /opt/redash/current
cp /opt/redash/.env /opt/redash/current
cd /opt/redash/current/rd_ui
bower install
cd /opt/redash/current

#install requirements
sudo pip install -r /opt/redash/current/requirements_dev.txt
sudo pip install -r /opt/redash/current/requirements.txt
sudo pip install pymongo==3.2.1

#update database
bin/run ./manage.py database drop_tables
bin/run ./manage.py database create_tables
bin/run ./manage.py users create --admin --password admin "Admin" "admin"

#Purge Redis cache
redis-cli -n 1 FLUSHALL

