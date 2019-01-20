#!/usr/bin/env bash
# This script sets up dockerized Redash on CentOS 7 and Ubuntu 18.04.
set -u

REDASH_BASE_PATH=/opt/redash
COMPOSE_PATH=/usr/local/bin/docker-compose

distro=unknown
install_docker(){
    # Check for CentOS vs Ubuntu, then install Docker as appropriate
    which yum >/dev/null 2>&1
    if [ $? -eq 0 ]; then
        distro=centos7
        sudo yum -y update
        sudo yum -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm
        sudo curl -L -o /etc/yum.repos.d/docker-ce.repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo chown root:root /etc/yum.repos.d/docker-ce.repo
        sudo restorecon -Fv /etc/yum.repos.d/docker-ce.repo
        sudo yum -y install docker-ce pwgen yajl
        sudo systemctl start docker
    else
        distro=ubuntu
        sudo apt-get update
        sudo apt-get -yy install apt-transport-https ca-certificates curl software-properties-common pwgen
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
        sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
        sudo apt-get update && sudo apt-get -y install docker-ce
    fi

    # Install Docker Compose
    sudo curl -L https://github.com/docker/compose/releases/download/1.22.0/docker-compose-$(uname -s)-$(uname -m) -o ${COMPOSE_PATH}
    sudo chmod +x ${COMPOSE_PATH}
    if [ "${distro}" = "centos7" ]; then
        sudo restorecon -Fv ${COMPOSE_PATH}
    fi

    # Allow current user to run Docker commands
    sudo usermod -aG docker $USER
}

create_directories() {
    if [[ ! -e $REDASH_BASE_PATH ]]; then
        sudo mkdir -p $REDASH_BASE_PATH
        sudo chown $USER:$USER $REDASH_BASE_PATH
    fi

    if [[ ! -e $REDASH_BASE_PATH/postgres-data ]]; then
        mkdir $REDASH_BASE_PATH/postgres-data
    fi
}

create_config() {
    if [[ -e $REDASH_BASE_PATH/env ]]; then
        rm $REDASH_BASE_PATH/env
        touch $REDASH_BASE_PATH/env
    fi

    COOKIE_SECRET=$(pwgen -1s 32)
    POSTGRES_PASSWORD=$(pwgen -1s 32)
    REDASH_DATABASE_URL="postgresql://postgres:${POSTGRES_PASSWORD}@postgres/postgres"

    echo "PYTHONUNBUFFERED=0" >> $REDASH_BASE_PATH/env
    echo "REDASH_LOG_LEVEL=INFO" >> $REDASH_BASE_PATH/env
    echo "REDASH_REDIS_URL=redis://redis:6379/0" >> $REDASH_BASE_PATH/env
    echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD" >> $REDASH_BASE_PATH/env
    echo "REDASH_COOKIE_SECRET=$COOKIE_SECRET" >> $REDASH_BASE_PATH/env
    echo "REDASH_DATABASE_URL=$REDASH_DATABASE_URL" >> $REDASH_BASE_PATH/env
}

setup_compose() {
    # Determine newest release of Redash
    REQUESTED_CHANNEL=stable
    if [ "${distro}" = "centos7" ]; then
        PRETTY_PRINTER=json_reformat
    else
        PRETTY_PRINTER=json_pp
    fi
    LATEST_VERSION=`curl -s "https://version.redash.io/api/releases?channel=$REQUESTED_CHANNEL"  | ${PRETTY_PRINTER} | grep "docker_image" | head -n 1 | awk 'BEGIN{FS=":"}{print $3}' | awk 'BEGIN{FS="\""}{print $1}'`

    # Update version string in the docker-compose yaml
    cd $REDASH_BASE_PATH
    REDASH_BRANCH="${REDASH_BRANCH:-master}" # Default branch/version to master if not specified in REDASH_BRANCH env var
    curl -OL https://raw.githubusercontent.com/getredash/redash/${REDASH_BRANCH}/setup/docker-compose.yml
    sed -ri "s/image: redash\/redash:([A-Za-z0-9.-]*)/image: redash\/redash:$LATEST_VERSION/" docker-compose.yml
    echo "export COMPOSE_PROJECT_NAME=redash" >> ~/.profile
    echo "export COMPOSE_FILE=${REDASH_BASE_PATH}/docker-compose.yml" >> ~/.profile
    export COMPOSE_PROJECT_NAME=redash
    export COMPOSE_FILE=${REDASH_BASE_PATH}/docker-compose.yml

    # Start the Redash containers
    sudo ${COMPOSE_PATH} run --rm server create_db
    sudo ${COMPOSE_PATH} up -d
}

install_docker
create_directories
create_config
setup_compose

# Make the new docker user group effective, so the user doesn't need to re-login
exec sg docker newgrp `id -gn`
