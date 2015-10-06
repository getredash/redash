FROM debian:wheezy
MAINTAINER Di Wu <diwu@yelp.com>

COPY . /opt/redash/current/

# Install dependencies
WORKDIR /opt/redash/current
RUN bash setup/bootstrap_docker.sh

CMD service redash_supervisord start
