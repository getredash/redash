FROM debian:wheezy
MAINTAINER Di Wu <diwu@yelp.com>

COPY . /opt/redash/current/

# Install dependencies
WORKDIR /opt/redash/current
RUN bash setup/bootstrap_docker.sh

# Build frontend sources
WORKDIR /opt/redash/current/rd_ui
USER redash
RUN mkdir -p /opt/redash/.npm/node_modules
RUN npm config set prefix /opt/redash/.npm/node_modules
RUN npm install -g bower
RUN npm install -g grunt-cli
RUN npm install
RUN /opt/redash/.npm/node_modules/bin/bower install
RUN /opt/redash/.npm/node_modules/bin/grunt build

# Reset working directory and user for future `docker attach` sessions
WORKDIR /opt/redash/current
USER root

CMD service redash_supervisord start
