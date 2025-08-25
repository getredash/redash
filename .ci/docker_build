#!/bin/bash

# This script only needs to run on the main Redash repo

if [ "${GITHUB_REPOSITORY}" != "getredash/redash" ]; then
	echo "Skipping image build for Docker Hub, as this isn't the main Redash repository"
	exit 0
fi

if [ "${GITHUB_REF_NAME}" != "master" ] && [ "${GITHUB_REF_NAME}" != "preview-image" ]; then
	echo "Skipping image build for Docker Hub, as this isn't the 'master' nor 'preview-image' branch"
	exit 0
fi

if [ "x${DOCKER_USER}" = "x" ] || [ "x${DOCKER_PASS}" = "x" ]; then
	echo "Skipping image build for Docker Hub, as the login details aren't available"
	exit 0
fi

set -e
VERSION=$(jq -r .version package.json)
VERSION_TAG="$VERSION.b${GITHUB_RUN_ID}.${GITHUB_RUN_NUMBER}"

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

docker login -u "${DOCKER_USER}" -p "${DOCKER_PASS}"

DOCKERHUB_REPO="redash/redash"
DOCKER_TAGS="-t redash/redash:preview -t redash/preview:${VERSION_TAG}"

# Build the docker container
docker build --build-arg install_groups="main,all_ds,dev" ${DOCKER_TAGS} .

# Push the container to the preview build locations
docker push "${DOCKERHUB_REPO}:preview"
docker push "redash/preview:${VERSION_TAG}"

echo "Built: ${VERSION_TAG}"
