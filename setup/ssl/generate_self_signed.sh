#!/bin/sh
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout server.key -out server.crt
openssl dhparam -out dhparam.pem 2048
