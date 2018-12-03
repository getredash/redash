#!/bin/bash

mkdir tmp
tar --exclude="./client" --exclude="./node_modules" --exclude="./tmp" -cvzf ./tmp/exclude.tar.gz .
