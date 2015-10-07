FROM ubuntu:trusty
MAINTAINER Di Wu <diwu@yelp.com>

COPY . /opt/redash/current/

WORKDIR /opt/redash/current

ENV FILES_BASE_URL /opt/redash/current/setup/files/

# Ubuntu packages
RUN apt-get update && \
  apt-get install -y python-pip python-dev curl build-essential pwgen libffi-dev sudo git-core && \
  # Postgres client
  apt-get -y install libpq-dev postgresql-client && \
  # Additional packages required for data sources:
  apt-get install -y libssl-dev libmysqlclient-dev

# Users creation
RUN useradd --system --comment " " --create-home redash
RUN useradd --system --comment " " --create-home postgres

# Pip requirements for all data source types
RUN pip install -U setuptools && \
  pip install -r requirements_all_ds.txt && \
  pip install -r requirements.txt && \
  pip install supervisor==3.1.2

# Setup supervisord
RUN mkdir -p /opt/redash/supervisord && \
    mkdir -p /opt/redash/logs && \
    pip install supervisor==3.1.2 && \
    cp /opt/redash/current/setup/files/supervisord_docker.conf /opt/redash/supervisord/supervisord.conf

# Fix permissions
RUN chown -R redash /opt/redash

# Expose ports
EXPOSE 5000
EXPOSE 9001

# Startup script
CMD ["supervisord -c /opt/redash/supervisord/supervisord.conf"]
