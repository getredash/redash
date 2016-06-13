FROM ubuntu:trusty

# Ubuntu packages
RUN apt-get update && \
  apt-get install -y python-pip python-dev curl build-essential pwgen libffi-dev sudo git-core wget \
  # Postgres client
  libpq-dev \
  # Additional packages required for data sources:
  libssl-dev libmysqlclient-dev freetds-dev libsasl2-dev && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Users creation
RUN useradd --system --comment " " --create-home redash

# Pip requirements for all data source types
RUN pip install -U setuptools && \
  pip install supervisor==3.1.2

COPY . /opt/redash/current
RUN chown -R redash /opt/redash/current

# Setting working directory
WORKDIR /opt/redash/current

ENV REDASH_STATIC_ASSETS_PATH="../rd_ui/dist/"

# Install project specific dependencies
RUN pip install -r requirements_all_ds.txt && \
  pip install -r requirements.txt

RUN curl https://deb.nodesource.com/setup_4.x | bash - && \
  apt-get install -y nodejs && \
  sudo -u redash -H make deps && \
  rm -rf node_modules rd_ui/node_modules /home/redash/.npm /home/redash/.cache && \
  apt-get purge -y nodejs && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Setup supervisord
RUN mkdir -p /opt/redash/supervisord && \
    mkdir -p /opt/redash/logs && \
    cp /opt/redash/current/setup/docker/supervisord/supervisord.conf /opt/redash/supervisord/supervisord.conf

# Fix permissions
RUN chown -R redash /opt/redash

# Expose ports
EXPOSE 5000
EXPOSE 9001

# Startup script
CMD ["supervisord", "-c", "/opt/redash/supervisord/supervisord.conf"]
