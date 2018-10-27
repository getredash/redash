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
    $DOCKER build --compress --squash . -f DockerfileBase -t redash/base
    $DOCKER build --compress --squash . -f DockerfileOffline -t redash/redash:latest -t redash_server:latest -t redash_worker:latest # TODO: Change to offline build
    $DOCKER_COMPOSE -f docker-compose.production.yml up -d
    $DOCKER_COMPOSE run --rm server create_db
    $DOCKER_COMPOSE run --rm postgres psql -h postgres -U postgres -c "create database tests"
} 

save_production_images() {
    # Collect Image names
    images=()
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

convert_docker_compose_files() {
    # Install kompose if its not installed
    if ! hash kompose ; then
        curl -L https://github.com/kubernetes/kompose/releases/download/v1.16.0/kompose-linux-amd64 -o kompose
        chmod +x kompose
        sudo mv ./kompose /usr/local/bin/kompose
    fi
    # Convert docker-compose yaml
    mkdir -p .cache/kubernetes
    kompose convert --provider openshift -f docker-compose.production.yml -o .cache/kubernetes
}

bundle_folder() {
    git bundle create .git/bundle --all
    tar -cvf ../redash.tar ../redash
}


build_client
download_pip_modules
build_and_run_images
save_production_images
convert_docker_compose_files
bundle_folder