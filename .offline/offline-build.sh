#!/bin/bash
set -eu
cd "$(git rev-parse --show-toplevel)"    # CD to main directory
DOCKER=docker                            # Set docker binary (docker.exe working in wsl)
DOCKER_COMPOSE=docker-compose            # Set docker binary (docker-compose.exe working in wsl)

load_images() {
    for img in $(find .tmp/images/*); do
        $DOCKER load -i $img ;
    done
}

tar_artifacts() {
    tar -cvf .offline/artifact.tar node_modules client/dist .tmp/pip 
}

build_and_run_images() {
    $DOCKER build --compress --squash . -f .offline/DockerfileBase -t redash/base
    $DOCKER build --compress --squash . -f .offline/Dockerfile -t redash/redash:latest -t redash_server:latest -t redash_worker:latest # TODO: Change to offline build
    $DOCKER_COMPOSE -f .offline/docker-kompose.yml up -d
} 

main() {
    load_images
    tar_artifacts
    build_and_run_images
}