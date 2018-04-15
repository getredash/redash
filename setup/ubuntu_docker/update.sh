#!/usr/bin/env bash

# This script updates dockerized Redash on Ubuntu 16.04.

set -eu

REDASH_BASE_PATH=/opt/redash

cd $REDASH_BASE_PATH
docker-compose stop
docker-compose rm -f
docker-compose pull
docker-compose up -d