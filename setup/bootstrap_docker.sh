#!/bin/bash
set -eu

FILES_BASE_URL=/opt/redash/current/setup/files/

# Base packages
apt-get dist-upgrade
apt-get update
apt-get install -y python-pip python-dev curl build-essential pwgen libffi-dev sudo git-core
pip install -U setuptools

# redash user
useradd --system --comment " " --create-home redash

# PostgreSQL
apt-get update
apt-get -y install libpq-dev postgresql

# Redis client
mkdir -p /tmp/redash && cd $_
curl -L https://github.com/antirez/redis/archive/3.0.4.tar.gz -o redis.tar.gz
mkdir redis
tar -zxvf redis.tar.gz -C redis --strip-components 1
cd redis
make redis-cli
cp src/redis-cli /usr/local/bin
rm -rf /tmp/redis

add_service() {
    service_name=$1
    service_command="/etc/init.d/$service_name"

    echo "Adding service: $service_name (/etc/init.d/$service_name)."
    chmod +x $service_command

    if command -v chkconfig >/dev/null 2>&1; then
        # we're chkconfig, so lets add to chkconfig and put in runlevel 345
        chkconfig --add $service_name && echo "Successfully added to chkconfig!"
        chkconfig --level 345 $service_name on && echo "Successfully added to runlevels 345!"
    elif command -v update-rc.d >/dev/null 2>&1; then
        #if we're not a chkconfig box assume we're able to use update-rc.d
        update-rc.d $service_name defaults && echo "Success!"
    else
        echo "No supported init tool found."
    fi

    $service_command start
}


mkdir /opt/redash/logs

# Default config file
cp $FILES_BASE_URL"env" /opt/redash/.env

# Install dependencies
cd /opt/redash/current
pip install -r requirements.txt

# BigQuery dependencies:
apt-get install -y libssl-dev

# MySQL dependencies:
apt-get install -y libmysqlclient-dev

# Pip requirements for all data source types
cd /opt/redash/current
pip install -r requirements_all_ds.txt

# Setup supervisord + sysv init startup script
mkdir -p /opt/redash/supervisord
pip install supervisor==3.1.2 # TODO: move to requirements.txt

# Get supervisord startup script
cp $FILES_BASE_URL"supervisord.conf" /opt/redash/supervisord/supervisord.conf

cp $FILES_BASE_URL"redash_supervisord_init" /etc/init.d/redash_supervisord
add_service "redash_supervisord"

# Fix permissions
chown -R redash /opt/redash

# Install Node.js
curl --silent --location https://deb.nodesource.com/setup_0.12 | bash -
apt-get install -y nodejs
