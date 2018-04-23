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

CURRENT_IMAGE_VERSION=`docker inspect redash_server_1 | grep "Image" | grep "redash" | awk 'BEGIN{FS=":"}{print $3}' | awk 'BEGIN{FS="\""}{print $1}'`
AVAILABLE_IMAGE_VERSION=`curl  -s https://version.redash.io/api/releases  | json_pp  | grep "docker_image" | head -n 1 | awk 'BEGIN{FS=":"}{print $3}' | awk 'BEGIN{FS="\""}{print $1}'`

var=`echo -e "$AVAILABLE_IMAGE_VERSION\n$CURRENT_IMAGE_VERSION"| sort -r | head -n 1`
if [[ $var -eq $AVAILABLE_IMAGE_VERSION ]]; then
    echo "There is a newer version of Redash docker Image"
    read -p "Do you want to upgrade it?  [Y/n] : " doUpgrade
    if [[ "$doUpgrade" = "y" || "$doUpgrade" = "Y" ]]; then
        docker stop redash_server_1 redash_worker_1 > /dev/null
        docker rm redash_server_1 redash_worker_1 > /dev/null
        docker-compose pull
        docker-compose up -d
        echo "Docker image and services were upgraded. Exiting."
    else
        echo "Docker image and services were not upgraded. Exiting."
    fi
else
    echo "Not Newer"
fi