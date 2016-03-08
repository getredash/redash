#!/bin/bash
set -eu

REDASH_BASE_PATH=/opt/redash_docker
# TODO: change this to master after merging:
FILES_BASE_URL=https://raw.githubusercontent.com/getredash/redash/docker/setup/ubuntu_docker/files/

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

# Base packages
apt-get update
apt-get install -y python-pip

# Install Docker
# TODO: copy script into setup files? Install docker from package? Use different base image?
curl -sSL https://get.docker.com/ | sh

pip install docker-compose

mkdir /opt/redash-docker
mkdir /opt/redash-docker/nginx
mkdir /opt/redash-docker/postgres-data
mkdir /opt/redash-docker/supervisord

# Get docker-compose file
wget $FILES_BASE_URL"docker-compose.yml" -O /opt/redash-docker/docker-compose.yml
wget $FILES_BASE_URL"nginx_redash_site" -O /opt/redash-docker/nginx/nginx.conf

# Add to .profile docker compose file location
# Setup upstart (?) for docker-compose
wget $FILES_BASE_URL"upstart.conf" -O /etc/init/redash-docker.conf
# Start everything
initctl reload-configuration
service redash-docker start

# TODO:
# 1. Create database / tables
# 2. Add the user to the docker group (sudo usermod -aG docker your-user).
