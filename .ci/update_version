#!/bin/bash
VERSION=$(jq -r .version package.json)
FULL_VERSION=${VERSION}+b${GITHUB_RUN_ID}.${GITHUB_RUN_NUMBER}

sed -ri "s/^__version__ = '([A-Za-z0-9.-]*)'/__version__ = '${FULL_VERSION}'/" redash/__init__.py
sed -i "s/dev/${GITHUB_SHA}/" client/app/version.json
