FROM node:12 as frontend-builder

# Controls whether to build the frontend assets
ARG skip_frontend_build

WORKDIR /frontend
COPY package.json package-lock.json /frontend/
COPY viz-lib /frontend/viz-lib
RUN if [ "x$skip_frontend_build" = "x" ] ; then npm ci --unsafe-perm; fi

COPY client /frontend/client
COPY webpack.config.js /frontend/
RUN if [ "x$skip_frontend_build" = "x" ] ; then npm run build; else mkdir -p /frontend/client/dist && touch /frontend/client/dist/multi_org.html && touch /frontend/client/dist/index.html; fi
FROM python:3.7-slim

EXPOSE 5000

# Controls whether to install extra dependencies needed for all data sources.
ARG skip_ds_deps
# Controls whether to install dev dependencies.
ARG skip_dev_deps

RUN useradd --create-home redash

# Oracle instantclient
ADD oracle/instantclient-basic-linux-19.6.0.0.0dbru.zip /tmp/instantclient-basic-linux-19.6.0.0.0dbru.zip
ADD oracle/instantclient-jdbc-linux-19.6.0.0.0dbru.zip /tmp/instantclient-jdbc-linux-19.6.0.0.0dbru.zip
ADD oracle/instantclient-odbc-linux-19.6.0.0.0dbru.zip /tmp/instantclient-odbc-linux-19.6.0.0.0dbru.zip
ADD oracle/instantclient-sdk-linux-19.6.0.0.0dbru.zip /tmp/instantclient-sdk-linux-19.6.0.0.0dbru.zip
ADD oracle/instantclient-sqlplus-linux-19.6.0.0.0dbru.zip /tmp/instantclient-sqlplus-linux-19.6.0.0.0dbru.zip

RUN apt-get update  -y
RUN apt-get install -y unzip

# UnZip Oracle instantclient
RUN unzip /tmp/instantclient-basic-linux-19.6.0.0.0dbru.zip -d /usr/local/
RUN unzip /tmp/instantclient-jdbc-linux-19.6.0.0.0dbru.zip -d /usr/local/
RUN unzip /tmp/instantclient-odbc-linux-19.6.0.0.0dbru.zip -d /usr/local/
RUN unzip /tmp/instantclient-sdk-linux-19.6.0.0.0dbru.zip -d /usr/local/
RUN unzip /tmp/instantclient-sqlplus-linux-19.6.0.0.0dbru.zip -d /usr/local/

RUN ln -s /usr/local/instantclient_19_6 /usr/local/instantclient
RUN ln -s /usr/local/instantclient/sqlplus /usr/bin/sqlplus

RUN apt-get install libaio-dev -y
RUN apt-get clean -y

# Ubuntu packages
RUN apt-get update && \
  apt-get install -y \
    curl \
    gnupg \
    build-essential \
    pwgen \
    libffi-dev \
    sudo \
    git-core \
    wget \
    # Postgres client
    libpq-dev \
    # ODBC support:
    g++ unixodbc-dev \
    # for SAML
    xmlsec1 \
    # Additional packages required for data sources:
    libssl-dev \
    default-libmysqlclient-dev \
    freetds-dev \
    libsasl2-dev \
    unzip \
    libsasl2-modules-gssapi-mit && \
  # MSSQL ODBC Driver:
  curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - && \
  curl https://packages.microsoft.com/config/debian/10/prod.list > /etc/apt/sources.list.d/mssql-release.list && \
  apt-get update && \
  ACCEPT_EULA=Y apt-get install -y msodbcsql17 && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

ARG databricks_odbc_driver_url=https://databricks.com/wp-content/uploads/2.6.10.1010-2/SimbaSparkODBC-2.6.10.1010-2-Debian-64bit.zip
ADD $databricks_odbc_driver_url /tmp/simba_odbc.zip
RUN unzip /tmp/simba_odbc.zip -d /tmp/ \
  && dpkg -i /tmp/SimbaSparkODBC-*/*.deb \
  && echo "[Simba]\nDriver = /opt/simba/spark/lib/64/libsparkodbc_sb64.so" >> /etc/odbcinst.ini \
  && rm /tmp/simba_odbc.zip \
  && rm -rf /tmp/SimbaSparkODBC*

WORKDIR /app

# Disalbe PIP Cache and Version Check
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PIP_NO_CACHE_DIR=1

ENV ORACLE_HOME=/usr/local/instantclient
ENV LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/instantclient

# We first copy only the requirements file, to avoid rebuilding on every file
# change.
COPY requirements.txt requirements_bundles.txt requirements_dev.txt requirements_all_ds.txt ./
RUN if [ "x$skip_dev_deps" = "x" ] ; then pip install -r requirements.txt -r requirements_dev.txt; else pip install -r requirements.txt; fi
RUN pip install cx_Oracle
RUN if [ "x$skip_ds_deps" = "x" ] ; then pip install -r requirements_all_ds.txt ; else echo "Skipping pip install -r requirements_all_ds.txt" ; fi

#Add REDASH ENV to add Oracle Query Runner
ENV REDASH_ADDITIONAL_QUERY_RUNNERS=redash.query_runner.oracle

COPY . /app
COPY --from=frontend-builder /frontend/client/dist /app/client/dist
RUN chown -R redash /app
USER redash

ENTRYPOINT ["/app/bin/docker-entrypoint"]
CMD ["server"]
