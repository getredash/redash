FROM python:3.7-slim-buster

EXPOSE 5000

# Controls whether to install extra dependencies needed for all data sources.
ARG skip_ds_deps
# Controls whether to install dev dependencies.
ARG skip_dev_deps

RUN useradd --create-home redash

# Ubuntu packages
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  curl \
  gnupg \
  build-essential \
  pwgen \
  libffi-dev \
  sudo \
  git-core \
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
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*


ARG TARGETPLATFORM
ARG databricks_odbc_driver_url=https://databricks.com/wp-content/uploads/2.6.10.1010-2/SimbaSparkODBC-2.6.10.1010-2-Debian-64bit.zip
RUN if [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
  curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
  && curl https://packages.microsoft.com/config/debian/10/prod.list > /etc/apt/sources.list.d/mssql-release.list \
  && apt-get update \
  && ACCEPT_EULA=Y apt-get install  -y --no-install-recommends msodbcsql17 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  && curl "$databricks_odbc_driver_url" --location --output /tmp/simba_odbc.zip \
  && chmod 600 /tmp/simba_odbc.zip \
  && unzip /tmp/simba_odbc.zip -d /tmp/ \
  && dpkg -i /tmp/SimbaSparkODBC-*/*.deb \
  && printf "[Simba]\nDriver = /opt/simba/spark/lib/64/libsparkodbc_sb64.so" >> /etc/odbcinst.ini \
  && rm /tmp/simba_odbc.zip \
  && rm -rf /tmp/SimbaSparkODBC*; fi

#RUN if [ "$TARGETPLATFORM" = "linux/arm64" ]; then \
#  export GRPC_PYTHON_BUILD_SYSTEM_OPENSSL=1 \
#  && export GRPC_PYTHON_BUILD_SYSTEM_ZLIB=1 \
#  && export CASS_DRIVER_NO_CYTHON=1 ; fi

WORKDIR /app

# Disable PIP Cache and Version Check
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PIP_NO_CACHE_DIR=1

# rollback pip version to avoid legacy resolver problem
RUN pip install pip==20.2.4;

# We first copy only the requirements file, to avoid rebuilding on every file change.
COPY requirements_all_ds.txt ./
RUN if [ "x$skip_ds_deps" = "x" ] ; then pip install -r requirements_all_ds.txt ; else echo "Skipping pip install -r requirements_all_ds.txt" ; fi

COPY requirements_dev.txt ./
RUN if [ "x$skip_dev_deps" = "x" ] ; then pip install -r requirements_dev.txt ; fi

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY --chown=redash . /app
COPY --from=redash/redash:10.0.0.b50363 --chown=redash /app/client/dist /app/client/dist
RUN chown redash /app
USER redash

ENTRYPOINT ["/app/bin/docker-entrypoint"]
CMD ["server"]
