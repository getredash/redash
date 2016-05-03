#!/usr/bin/env bash

#Provision VM
vagrant up

#Run tests
vagrant ssh -c "cd /opt/redash/current; nosetests --with-coverage --cover-package=redash tests/"