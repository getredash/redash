FROM node:14.17 as frontend-builder

RUN npm install --global --force yarn@1.22.19

# Controls whether to build the frontend assets
ARG skip_frontend_build

ENV CYPRESS_INSTALL_BINARY=0
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

RUN useradd -m -d /frontend redash
USER redash

WORKDIR /frontend
COPY --chown=redash package.json yarn.lock .yarnrc /frontend/
COPY --chown=redash viz-lib /frontend/viz-lib

# Controls whether to instrument code for coverage information
ARG code_coverage
ENV BABEL_ENV=${code_coverage:+test}

RUN if [ "x$skip_frontend_build" = "x" ] ; then yarn --frozen-lockfile --network-concurrency 1; fi

COPY --chown=redash client /frontend/client
COPY --chown=redash webpack.config.js /frontend/
RUN if [ "x$skip_frontend_build" = "x" ] ; then yarn build; else mkdir -p /frontend/client/dist && touch /frontend/client/dist/multi_org.html && touch /frontend/client/dist/index.html; fi

FROM python:3.8-slim-buster

EXPOSE 5000

# Controls whether to install extra dependencies needed for all data sources.
ARG skip_ds_deps
# Controls whether to install dev dependencies.
ARG skip_dev_deps
# Controls whether to install all dependencies for testing.
ARG test_all_deps

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
ARG databricks_odbc_driver_url=https://databricks-bi-artifacts.s3.us-east-2.amazonaws.com/simbaspark-drivers/odbc/2.6.26/SimbaSparkODBC-2.6.26.1045-Debian-64bit.zip
RUN if [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
  curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - \
  && curl https://packages.microsoft.com/config/debian/10/prod.list > /etc/apt/sources.list.d/mssql-release.list \
  && apt-get update \
  && ACCEPT_EULA=Y apt-get install  -y --no-install-recommends msodbcsql17 \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/* \
  && curl "$databricks_odbc_driver_url" --location --output /tmp/simba_odbc.zip \
  && chmod 600 /tmp/simba_odbc.zip \
  && unzip /tmp/simba_odbc.zip -d /tmp/simba \
  && dpkg -i /tmp/simba/*.deb \
  && printf "[Simba]\nDriver = /opt/simba/spark/lib/64/libsparkodbc_sb64.so" >> /etc/odbcinst.ini \
  && rm /tmp/simba_odbc.zip \
  && rm -rf /tmp/simba; fi

WORKDIR /app

# Disable PIP Cache and Version Check
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
ENV PIP_NO_CACHE_DIR=1

RUN pip install pip==23.1.2;

# We first copy only the requirements file, to avoid rebuilding on every file change.
COPY requirements_all_ds.txt ./
RUN if [ "x$skip_ds_deps" = "x" ] ; then cat requirements_all_ds.txt | sed -e '/^\s*#.*$/d' -e '/^\s*$/d' | xargs -n 1 pip install || true ; else echo "Skipping pip install -r requirements_all_ds.txt" ; fi


COPY requirements_dev.txt ./
RUN if [ "x$skip_dev_deps" = "x" ] ; then pip install -r requirements_dev.txt ; fi

COPY requirements.txt ./
RUN pip install -r requirements.txt

RUN if [ "x$test_all_deps" != "x" ] ; then pip3 install -r requirements.txt -r requirements_dev.txt -r requirements_all_ds.txt ; fi

COPY --chown=redash . /app
COPY --from=frontend-builder --chown=redash /frontend/client/dist /app/client/dist
RUN chown redash /app
USER redash

ENTRYPOINT ["/app/bin/docker-entrypoint"]
CMD ["server"]
