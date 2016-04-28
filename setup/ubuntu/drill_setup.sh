#!/bin/bash
set -eu

# Verify running as root:
if [ "$(id -u)" != "0" ]; then
    if [ $# -ne 0 ]; then
        echo "Failed running with sudo. Exiting." 1>&2
        exit 1
    fi
    echo "This script must be run as root. Trying to run with sudo."
    sudo bash "$0" --with-sudo
    exit 0
fi

apt-get update
apt-get install -y unixodbc-dev libodbc1
pip install pyodbc

# Get the mapr drill odbc driver package
apt-get install -y alien dpkg-dev debhelper
apt-get install -y sasl2-bin
cd /tmp
wget --no-verbose http://package.mapr.com/tools/MapR-ODBC/MapR_Drill/MapRDrill_odbc_v1.2.1.1000/MapRDrillODBC-1.2.1.x86_64.rpm
alien MapRDrillODBC-1.2.1.x86_64.rpm --scripts
dpkg -i maprdrillodbc_1.2.1-2_amd64.deb

cp /opt/mapr/drillodbc/Setup/mapr.drillodbc.ini /etc/mapr.drillodbc.ini
# The encoding should be set to whatever encoding your drill is using
perl -i -pe 's/DriverManagerEncoding=UTF-32/DriverManagerEncoding=UTF-16/g' /etc/mapr.drillodbc.ini
cp /opt/mapr/drillodbc/Setup/odbc.ini /etc/odbc.ini
cp /opt/mapr/drillodbc/Setup/odbcinst.ini /etc/odbcinst.ini

echo \"ODBCINI=/etc/odbc.ini\" >> /etc/environment
echo \"MAPRDRILLINI=/etc/mapr.drillodbc.ini\" >> /etc/environment
echo \"LD_LIBRARY_PATH=/opt/mapr/drillodbc/lib:/opt/mapr/drillodbc/lib/64\" >> /etc/environment