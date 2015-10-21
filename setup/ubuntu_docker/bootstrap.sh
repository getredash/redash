#!/bin/bash
set -eu

REDASH_BASE_PATH=/opt/redash_docker
# TODO: change this to master after merging:
FILES_BASE_URL=https://raw.githubusercontent.com/EverythingMe/redash/docker/setup/ubuntu_docker/files/

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
apt-get update
# apt-get install -y python-pip python-dev nginx curl build-essential pwgen

# Install Docker
# TODO: copy script into setup files
curl -sSL https://get.docker.com/ | sh

# Get docker-compose file
wget $FILES_BASE_URL"docker-compose.yml"
# Add to .profile docker compose file location
# Setup upstart (?) for docker-compose
wget $FILES_BASE_URL"upstart.conf" -O /etc/init/redash-docker.conf
# Start everything
initctl reload-configuration
service redash-docker start
# Create database / tables
