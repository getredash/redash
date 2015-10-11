FROM ubuntu:trusty
MAINTAINER Di Wu <diwu@yelp.com>

# Ubuntu packages
RUN apt-get update && \
  apt-get install -y python-pip python-dev curl build-essential pwgen libffi-dev sudo git-core wget && \
  # Postgres client
  apt-get -y install libpq-dev postgresql-client && \
  # Additional packages required for data sources:
  apt-get install -y libssl-dev libmysqlclient-dev

# Users creation
RUN useradd --system --comment " " --create-home redash

# Pip requirements for all data source types
RUN pip install -U setuptools && \
  pip install supervisor==3.1.2

# Download latest source and extract into /opt/redash/current
# COPY setup/latest_release_url.py /tmp/latest_release_url.py
# RUN wget $(python /tmp/latest_release_url.py) -O redash.tar.gz && \
#     mkdir -p /opt/redash/current && \
#     tar -C /opt/redash/current -xvf redash.tar.gz && \
#     rm redash.tar.gz
COPY . /opt/redash/current

# Setting working directory
WORKDIR /opt/redash/current

# Install project specific dependencies
RUN pip install -r requirements_all_ds.txt && \
  pip install -r requirements.txt

# Setup supervisord
RUN mkdir -p /opt/redash/supervisord && \
    mkdir -p /opt/redash/logs && \
    cp /opt/redash/current/setup/files/supervisord_docker.conf /opt/redash/supervisord/supervisord.conf

# Fix permissions
RUN chown -R redash /opt/redash

# Expose ports
EXPOSE 5000
EXPOSE 9001

# Startup script
CMD ["supervisord", "-c", "/opt/redash/supervisord/supervisord.conf"]
