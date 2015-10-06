FROM ubuntu:trusty
MAINTAINER Di Wu <diwu@yelp.com>

COPY . /opt/redash/current/

WORKDIR /opt/redash/current

ENV FILES_BASE_URL /opt/redash/current/setup/files/

# Base packages
RUN apt-get dist-upgrade
RUN apt-get update
RUN apt-get install -y python-pip python-dev curl build-essential pwgen libffi-dev sudo git-core
RUN pip install -U setuptools

# redash user
RUN useradd --system --comment " " --create-home redash

# PostgreSQL
RUN apt-get update
RUN apt-get -y install libpq-dev postgresql-client

# Make logs folder
RUN mkdir /opt/redash/logs

# Default config file
RUN cp $FILES_BASE_URL"env" /opt/redash/.env

# Install dependencies
RUN cd /opt/redash/current
RUN pip install -r requirements.txt

# BigQuery dependencies:
RUN apt-get install -y libssl-dev

# MySQL dependencies:
RUN apt-get install -y libmysqlclient-dev

# Pip requirements for all data source types
RUN pip install -r requirements_all_ds.txt

# Setup supervisord + sysv init startup script
RUN mkdir -p /opt/redash/supervisord
RUN pip install supervisor==3.1.2

# Get supervisord startup script
RUN cp $FILES_BASE_URL"supervisord_docker.conf" /opt/redash/supervisord/supervisord.conf

RUN cp $FILES_BASE_URL"redash_supervisord_init" /etc/init.d/redash_supervisord

# Fix permissions
RUN chown -R redash /opt/redash

CMD bash /etc/init.d/redash_supervisord start
