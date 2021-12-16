#!/bin/bash

export IMAGE_TAG=$1
docker build --build-arg skip_dev_deps=1 -t 307185671274.dkr.ecr.us-west-2.amazonaws.com/redash:$IMAGE_TAG . && docker push 307185671274.dkr.ecr.us-west-2.amazonaws.com/redash:$IMAGE_TAG
