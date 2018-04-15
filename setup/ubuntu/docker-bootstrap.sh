#!/usr/bin/env bash

# This script setups dockerized Redash on Ubuntu 16.04.

set -eu

REDASH_BASE_PATH=/opt/redash
REDASH_BRANCH="${REDASH_BRANCH:-master}" # Default branch/version to master if not specified in REDASH_BRANCH env var
REDASH_VERSION=${REDASH_VERSION-3.0.0.b3134} # Install latest version if not specified in REDASH_VERSION env var
LATEST_URL="https://s3.amazonaws.com/redash-releases/redash.${REDASH_VERSION}.tar.gz"
VERSION_DIR="$REDASH_BASE_PATH/redash.${REDASH_VERSION}"
REDASH_TARBALL=/tmp/redash.tar.gz
FILES_BASE_URL=https://raw.githubusercontent.com/getredash/redash/${REDASH_BRANCH}/setup/ubuntu/files

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

install_docker(){
	apt-get update && apt-get -yy install apt-transport-https ca-certificates curl software-properties-common wget 
	curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
	sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
	apt-get update && apt-get -y install docker-ce
	curl -L https://github.com/docker/compose/releases/download/1.21.0/docker-compose-$(uname -s)-$(uname -m) -o /usr/local/bin/docker-compose
	chmod +x /usr/local/bin/docker-compose
}

create_directories() {
    
    if [[ ! -e $REDASH_BASE_PATH ]]; then
    	mkdir -p $REDASH_BASE_PATH
    fi
   
    # Default config file
    if [[ ! -f "$REDASH_BASE_PATH/.env" ]]; then
        wget "$FILES_BASE_URL/env" -O $REDASH_BASE_PATH/.env
    fi

    COOKIE_SECRET=$(pwgen -1s 32)
    echo "export REDASH_COOKIE_SECRET=$COOKIE_SECRET" >> $REDASH_BASE_PATH/.env

    if [[ ! -e $REDASH_BASE_PATH/postgres-data ]]; then
    	mkdir $REDASH_BASE_PATH/postgres-data
    fi
}

verify_root
verify_ubuntu
install_docker
create_directories

cd $REDASH_BASE_PATH
wget -O $REDASH_BASE_PATH/docker-compose.yml https://raw.githubusercontent.com/getredash/redash/master/docker-compose.production.yml
sed -i '/ volumes:/s/#//g' $REDASH_BASE_PATH/docker-compose.yml
sed -i 's/ volumes:/volumes:/g' $REDASH_BASE_PATH/docker-compose.yml
sed -i '/postgres-data:/s/#/ /g' $REDASH_BASE_PATH/docker-compose.yml
sed -i 's/opt\/postgres-data/opt\/redash\/postgres-data/g' $REDASH_BASE_PATH/docker-compose.yml
docker-compose run --rm server create_db
docker-compose up -d
