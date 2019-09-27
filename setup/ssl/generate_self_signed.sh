#!/bin/sh
openssl req -new -newkey rsa:2048 -nodes -keyout server.key -out server.crt

