#!/bin/bash
set -eu

REDASH_BASE_PATH=/opt/redash
FILES_BASE_URL=https://raw.githubusercontent.com/EverythingMe/redash/docs_setup/setup/files/

# Verify running as root:
if [ "$(id -u)" != "0" ]; then
    if [ $# -ne 0 ]; then
        echo "Failed running with sudo. Exiting." 1>&2
        exit 1
    fi
    echo "This script must be run as root. Trying to run with sudo."
    sudo bash $0 --with-sudo
    exit 0
fi

# Base packages
apt-get dist-upgrade
apt-get update
apt-get install -y python-pip python-dev nginx curl build-essential pwgen
pip install -U setuptools

# redash user
# TODO: check user doesn't exist yet?
adduser --system --no-create-home --disabled-login --gecos "" redash

# PostgreSQL
pg_available=0
psql --version || pg_available=$?
if [ $pg_available -ne 0 ]; then
    wget $FILES_BASE_URL"postgres_apt.sh" -O /tmp/postgres_apt.sh
    bash /tmp/postgres_apt.sh
    apt-get update
    apt-get -y install postgresql-9.3 postgresql-server-dev-9.3
fi

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

# Redis
redis_available=0
redis-cli --version || redis_available=$?
if [ $redis_available -ne 0 ]; then
    wget http://download.redis.io/releases/redis-2.8.17.tar.gz
    tar xzf redis-2.8.17.tar.gz
    rm redis-2.8.17.tar.gz
    cd redis-2.8.17
    make
    make install

    # Setup process init & configuration

    REDIS_PORT=6379
    REDIS_CONFIG_FILE="/etc/redis/$REDIS_PORT.conf"
    REDIS_LOG_FILE="/var/log/redis_$REDIS_PORT.log"
    REDIS_DATA_DIR="/var/lib/redis/$REDIS_PORT"

    mkdir -p `dirname "$REDIS_CONFIG_FILE"` || die "Could not create redis config directory"
    mkdir -p `dirname "$REDIS_LOG_FILE"` || die "Could not create redis log dir"
    mkdir -p "$REDIS_DATA_DIR" || die "Could not create redis data directory"

    wget -O /etc/init.d/redis_6379 $FILES_BASE_URL"redis_init"
    wget -O $REDIS_CONFIG_FILE $FILES_BASE_URL"redis.conf"

    add_service "redis_$REDIS_PORT"

    cd ..
    rm -rf redis-2.8.17
fi

# Directories
if [ ! -d "$REDASH_BASE_PATH" ]; then
    sudo mkdir /opt/redash
    sudo chown redash /opt/redash
    sudo -u redash mkdir /opt/redash/logs
fi

# Default config file
if [ ! -f "/opt/redash/.env" ]; then
    sudo -u redash wget $FILES_BASE_URL"env" -O /opt/redash/.env
fi

# Install latest version
REDASH_VERSION=${REDASH_VERSION-0.7.1.b1015}
LATEST_URL="https://github.com/EverythingMe/redash/releases/download/v${REDASH_VERSION}/redash.$REDASH_VERSION.tar.gz"
VERSION_DIR="/opt/redash/redash.$REDASH_VERSION"
REDASH_TARBALL=/tmp/redash.tar.gz

if [ ! -d "$VERSION_DIR" ]; then
    sudo -u redash wget $LATEST_URL -O $REDASH_TARBALL
    sudo -u redash mkdir $VERSION_DIR
    sudo -u redash tar -C $VERSION_DIR -xvf $REDASH_TARBALL
    ln -nfs $VERSION_DIR /opt/redash/current
    ln -nfs /opt/redash/.env /opt/redash/current/.env

    cd /opt/redash/current

    # TODO: venv?
    pip install -r requirements.txt
fi

# Create database / tables
pg_user_exists=0
sudo -u postgres psql postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='redash'" | grep -q 1 || pg_user_exists=$?
if [ $pg_user_exists -ne 0 ]; then
    echo "Creating redash postgres user & database."
    sudo -u postgres createuser redash --no-superuser --no-createdb --no-createrole
    sudo -u postgres createdb redash --owner=redash

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
sudo -u postgres psql postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='redash_reader'" | grep -q 1 || pg_user_exists=$?
if [ $pg_user_exists -ne 0 ]; then
    echo "Creating redash reader postgres user."
    REDASH_READER_PASSWORD=$(pwgen -1)
    sudo -u postgres psql -c "CREATE ROLE redash_reader WITH PASSWORD '$REDASH_READER_PASSWORD' NOCREATEROLE NOCREATEDB NOSUPERUSER LOGIN"
    sudo -u redash psql -c "grant select(id,name,type) ON data_sources to redash_reader;" redash
    sudo -u redash psql -c "grant select(id,name) ON users to redash_reader;" redash
    sudo -u redash psql -c "grant select on activity_log, events, queries, dashboards, widgets, visualizations, query_results to redash_reader;" redash

    cd /opt/redash/current
    sudo -u redash bin/run ./manage.py ds new -n "re:dash metadata" -t "pg" -o "{\"user\": \"redash_reader\", \"password\": \"$REDASH_READER_PASSWORD\", \"host\": \"localhost\", \"dbname\": \"redash\"}"
fi

# BigQuery dependencies:
apt-get install -y libffi-dev libssl-dev

# MySQL dependencies:
apt-get install -y libmysqlclient-dev

# Pip requirements for all data source types
cd /opt/redash/current
pip install -r requirements_all_ds.txt

# Setup supervisord + sysv init startup script
sudo -u redash mkdir -p /opt/redash/supervisord
pip install supervisor==3.1.2 # TODO: move to requirements.txt

# Get supervisord startup script
sudo -u redash wget -O /opt/redash/supervisord/supervisord.conf $FILES_BASE_URL"supervisord.conf"

wget -O /etc/init.d/redash_supervisord $FILES_BASE_URL"redash_supervisord_init"
add_service "redash_supervisord"

# Nginx setup
rm /etc/nginx/sites-enabled/default
wget -O /etc/nginx/sites-available/redash $FILES_BASE_URL"nginx_redash_site"
ln -nfs /etc/nginx/sites-available/redash /etc/nginx/sites-enabled/redash
service nginx restart

