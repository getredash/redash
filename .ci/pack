#!/bin/bash
NAME=redash
VERSION=$(jq -r .version package.json)
FULL_VERSION=$VERSION+b$CIRCLE_BUILD_NUM
FILENAME=$NAME.$FULL_VERSION.tar.gz

mkdir -p /tmp/artifacts/

tar -zcv -f /tmp/artifacts/$FILENAME --exclude=".git" --exclude="optipng*" --exclude="cypress" --exclude="*.pyc" --exclude="*.pyo" --exclude="venv" *
