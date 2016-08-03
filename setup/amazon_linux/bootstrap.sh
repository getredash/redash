#!/bin/bash
set -eu

REDASH_BASE_PATH=/opt/redash

# Default branch/version to master if not specified in REDASH_BRANCH env var
REDASH_BRANCH="${REDASH_BRANCH:-master}"

# Install latest version if not specified in REDASH_VERSION env var
REDASH_VERSION=${REDASH_VERSION-0.11.1.b2095}
LATEST_URL="https://github.com/getredash/redash/releases/download/v${REDASH_VERSION}/redash.${REDASH_VERSION}.tar.gz"
VERSION_DIR="/opt/redash/redash.${REDASH_VERSION}"
REDASH_TARBALL=/tmp/redash.tar.gz

FILES_BASE_URL=https://raw.githubusercontent.com/getredash/redash/${REDASH_BRANCH}/setup/amazon_linux/files/

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
yum update
yum install -y python-pip python-devel nginx curl
yes | yum groupinstall -y "Development Tools"
yum install -y libffi-devel openssl-devel

# redash user
# TODO: check user doesn't exist yet?
if [-x $(adduser --system --no-create-home --comment "" redash)]; then
  echo "redash user have already registered."
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

# PostgreSQL
pg_available=0
psql --version || pg_available=$?
if [ $pg_available -ne 0 ]; then
    # wget $FILES_BASE_URL"postgres_apt.sh" -O /tmp/postgres_apt.sh
    # bash /tmp/postgres_apt.sh
    yum update
    yum -y install postgresql93-server postgresql93-devel
    service postgresql93 initdb
    add_service "postgresql93"
fi



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


if [ ! -d "$REDASH_BASE_PATH" ]; then
    sudo mkdir /opt/redash
    sudo chown redash /opt/redash
    sudo -u redash mkdir /opt/redash/logs
fi

# Default config file
if [ ! -f "/opt/redash/.env" ]; then
    sudo -u redash wget $FILES_BASE_URL"env" -O /opt/redash/.env
fi

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

# InfluxDB dependencies:
pip install influxdb==2.6.0

# BigQuery dependencies:
pip install google-api-python-client==1.2 pyOpenSSL==0.14 oauth2client==1.2

# MySQL dependencies:
yum install -y mysql-devel
pip install MySQL-python==1.2.5

# Microsoft SQL Server dependencies (`sudo` required):
sudo yum install -y freetds-devel
sudo pip install pymssql==2.1.2

# Mongo dependencies:
pip install pymongo==2.7.2

# Setup supervisord + sysv init startup script
sudo -u redash mkdir -p /opt/redash/supervisord
pip install supervisor==3.1.2 # TODO: move to requirements.txt

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

    sudo yum install -y expect

    REDASH_READER_PASSWORD=$(mkpasswd)
    sudo -u postgres psql -c "CREATE ROLE redash_reader WITH PASSWORD '$REDASH_READER_PASSWORD' NOCREATEROLE NOCREATEDB NOSUPERUSER LOGIN"
    sudo -u redash psql -c "grant select(id,name,type) ON data_sources to redash_reader;" redash
    sudo -u redash psql -c "grant select on events, queries, dashboards, widgets, visualizations, query_results to redash_reader;" redash

    cd /opt/redash/current
    sudo -u redash bin/run ./manage.py ds new -n "re:dash metadata" -t "pg" -o "{\"user\": \"redash_reader\", \"password\": \"$REDASH_READER_PASSWORD\", \"host\": \"localhost\", \"dbname\": \"redash\"}"
fi


# Get supervisord startup script
sudo -u redash wget -O /opt/redash/supervisord/supervisord.conf $FILES_BASE_URL"supervisord.conf"

# install start-stop-daemon
wget http://developer.axis.com/download/distribution/apps-sys-utils-start-stop-daemon-IR1_9_18-2.tar.gz
tar xvzf apps-sys-utils-start-stop-daemon-IR1_9_18-2.tar.gz
cd apps/sys-utils/start-stop-daemon-IR1_9_18-2/
gcc start-stop-daemon.c -o start-stop-daemon
cp start-stop-daemon /sbin/

wget -O /etc/init.d/redash_supervisord $FILES_BASE_URL"redash_supervisord_init"
add_service "redash_supervisord"

# Nginx setup
if [ -d "/etc/nginx/conf.d" ]; then
  echo "/etc/nginx/conf.d exists."
  wget -O /etc/nginx/conf.d/redash.conf $FILES_BASE_URL"nginx_redash_site"
elif [ -d "/etc/nginx/sites-available" ]; then
  echo "/etc/nginx/sites-available exists."
  wget -O /etc/nginx/sites-available/redash $FILES_BASE_URL"nginx_redash_site"
  ln -nfs /etc/nginx/sites-available/redash /etc/nginx/conf.d/redash.conf
else
  mkdir /etc/nginx/sites-available
  if [ $? -ne 0 ] ; then
    echo "create /etc/nginx/sites-available ok"
    wget -O /etc/nginx/sites-available/redash $FILES_BASE_URL"nginx_redash_site"
    ln -nfs /etc/nginx/sites-available/redash /etc/nginx/conf.d/redash.conf
  else
    echo "ERROR: create /etc/nginx/sites-available failed"
    exit
  fi
fi

service nginx restart
