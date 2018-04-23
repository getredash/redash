#!/usr/bin/env bash

# This script upgrades dockerized Redash on Ubuntu 16.04.

set -eu

REDASH_BASE_PATH=/opt/redash
REDASH_BRANCH="${REDASH_BRANCH:-master}" # Default branch/version to master if not specified in REDASH_BRANCH env var
FILES_BASE_URL=https://raw.githubusercontent.com/getredash/redash/${REDASH_BRANCH}/setup/ubuntu_docker

verify_root() {
    # Verify running as root:
    if [[ "$(id -u)" != "0" ]]; then
        if [[ $# -ne 0 ]]; then
            echo "Failed running with sudo. Exiting." 1>&2
            exit 1
        fi
        echo "This script must be run as root. Trying to run with sudo."
        sudo bash "$0" --with-sudo
        exit 1
    fi
}

verify_ubuntu() {
	if [[ "$(cat /etc/lsb-release | grep "DISTRIB_ID" | awk 'BEGIN{FS="="}{print $2}')" != "Ubuntu" ]]; then
		echo "This operating system is not Ubuntu. Exiting."
		exit 1
	fi
}

verify_root
verify_ubuntu

if [[ ! -d $REDASH_BASE_PATH/upgrade ]]; then
	mkdir -p $REDASH_BASE_PATH/upgrade
fi

wget -O $REDASH_BASE_PATH/upgrade/upgrade.sh $FILES_BASE_URL/upgrade.sh

cd $REDASH_BASE_PATH
docker-compose stop
docker-compose rm -f
docker-compose pull
docker-compose up -d