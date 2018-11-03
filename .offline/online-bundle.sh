#!/bin/bash
cd "$(git rev-parse --show-toplevel)"        # CD to main directory 
. .offline/offline-build.sh --source-only    # Import offline-build functions

build_client() {
    npm install
    NODE_ENV=production npx webpack
}

download_pip_modules() {
    mkdir -p .tmp/pip
    pip download -d .tmp/pip -r requirements.txt -r requirements_dev.txt -r requirements_all_ds.txt
}

save_production_images() {
    # Collect Image names
    images=('redash/base:latest')
    for img in $(cat docker-compose.production.yml | awk '{if ($1 == "image:") print $2;}'); do
        images+=($img)
    done

    # Save images
    echo Images: ${images[*]}
    mkdir -p .tmp/images
    for img in ${images[*]}; do
        echo Save: $img
        docker save $img -o ".tmp/images/${img//[:\/]/-}.tar"
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
    mkdir -p .tmp/kubernetes
    kompose convert --provider openshift -f docker-compose.production.yml -o .tmp/kubernetes --insecure-repository
}

bundle_folder() {
    git bundle create .git/bundle --all
    tar cvfz ../redash.tar.gz --exclude node_modules --exclude client/dist --exclude .tmp/pip  ../redash
    base64 < ../redash.tar.gz > ../redash.txt
}


#build_client
#download_pip_modules
#tar_artifacts
#build_and_run_images
#save_production_images
#convert_docker_compose_files
#bundle_folder