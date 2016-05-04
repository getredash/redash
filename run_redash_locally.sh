#!/usr/bin/env bash

#Provision VM
vagrant up

#start server and background workers
vagrant ssh -c "cd /opt/redash/current; bin/run honcho start -f Procfile.dev" &