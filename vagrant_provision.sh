#!/usr/bin/env bash

cd /opt/redash/current
cp /opt/redash/.env /opt/redash/current
cd /opt/redash/current/rd_ui
bower install
cd /opt/redash/current

#update database
bin/run ./manage.py database drop_tables
bin/run ./manage.py database create_tables
bin/run ./manage.py users create --admin --password admin "Admin" "admin"

