#!/usr/bin/sudo bash
set -eu
cd "$(git rev-parse --show-toplevel)"  # CD to main directory 
DOCKER=docker                          # Set docker binary (docker.exe working too)
DOCKER_COMPOSE=docker-compose          # Set docker binary (docker-compose.exe working too)


build_client() {
    npm install
    NODE_ENV=production npx webpack
}

download_pip_modules() {
    mkdir -p .cache/pip
    pip download -d .cache/pip -r requirements.txt -r requirements_dev.txt -r requirements_all_ds.txt
}

build_and_run_images() {
    #$DOCKER build --compress --squash . -f DockerfileBase -t redash/base
    $DOCKER build --compress --squash . -f DockerfileOffline -t redash/redash:latest -t redash_server:latest -t redash_worker:latest # TODO: Change to offline build
    $DOCKER_COMPOSE -f docker-compose.production.yml -d up
    $DOCKER_COMPOSE run --rm server create_db
    $DOCKER_COMPOSE run --rm postgres psql -h postgres -U postgres -c "create database tests"
} 

save_production_images() {
    # Collect Image names
    images=('redash_worker:latest' 'redash_server:latest')
    for img in $(cat docker-compose.production.yml | awk '{if ($1 == "image:") print $2;}'); do
        images+=($img)
    done

    # Save images
    echo Images: ${images[*]}
    mkdir -p .cache/images
    for img in ${images[*]}; do
        echo Save: $img
        docker save $img -o ".cache/images/${img//[:\/]/-}.tar.docker"
    done
}

save_specific_images() {
    $DOCKER save -o .cache/images/redis.tar redis:3.0-alpine
    $DOCKER save -o .cache/images/postgres.tar postgres:9.5.6-alpine
    $DOCKER save -o .cache/images/redash_base.tar redash/base:latest
    $DOCKER save -o .cache/images/redash_server.tar redash_server:latest
    $DOCKER save -o .cache/images/redash_worker.tar redash_worker:latest
    $DOCKER save -o .cache/images/redash_redash.tar redash/redash:latest
    $DOCKER save -o .cache/images/redash_nginx.tar redash/nginx:latest
}

convert_docker_compose_files() {
    # Install kompose if its not installed
    if ! hash kompose ; then
        curl -L https://github.com/kubernetes/kompose/releases/download/v1.16.0/kompose-linux-amd64 -o kompose
        chmod +x kompose
        sudo mv ./kompose /usr/local/bin/kompose
    fi
    # Convert docker-compose yaml
    mkdir -p .cache/kubernetes
    kompose convert -f docker-compose.production.yml -o .cache/kubernetes
}

bundle_folder() {
    git bundle create .git/bundle --all
    tar -cvf ../redash.tar .
}



build_client
download_pip_modules
build_and_run_images
save_production_images
save_specific_images
convert_docker_compose_files
bundle_git_folder