# Controls whether to build the frontend assets
ARG FRONTEND_BUILD_MODE=0

# MODE 0: create empty files. useful for backend tests
FROM alpine:3.19 as frontend-builder-0
RUN \
  mkdir -p /frontend/client/dist && \
  touch /frontend/client/dist/multi_org.html && \
  touch /frontend/client/dist/index.html

# MODE 1: copy static frontend from host, useful for CI to ignore building static content multiple times
FROM alpine:3.19 as frontend-builder-1
COPY client/dist /frontend/client/dist

# MODE 2: build static content in docker, can be used for a local development
FROM node:18-bookworm as frontend-builder-2
RUN npm install --global --force yarn@1.22.22
ENV CYPRESS_INSTALL_BINARY=0
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1
RUN useradd -m -d /frontend redash
USER redash
WORKDIR /frontend
COPY --chown=redash package.json yarn.lock .yarnrc /frontend/
COPY --chown=redash viz-lib /frontend/viz-lib
COPY --chown=redash scripts /frontend/scripts

RUN yarn --frozen-lockfile --network-concurrency 1;
COPY --chown=redash client /frontend/client
COPY --chown=redash webpack.config.js /frontend/
RUN yarn build

FROM frontend-builder-${FRONTEND_BUILD_MODE} as frontend-builder

FROM python:3.8-slim-bookworm

EXPOSE 5000

RUN useradd --create-home redash

# Ubuntu packages
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  pkg-config \
  curl \
  gnupg \
  build-essential \
  pwgen \
  libffi-dev \
  sudo \
  git-core \
  # Kerberos, needed for MS SQL Python driver to compile on arm64
  libkrb5-dev \
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

RUN \
  curl https://packages.microsoft.com/config/debian/12/prod.list > /etc/apt/sources.list.d/mssql-release.list && \
  curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg && \
  apt update && \
  ACCEPT_EULA=Y apt install  -y --no-install-recommends msodbcsql18 && \
  apt clean && \
  rm -rf /var/lib/apt/lists/*

ARG TARGETPLATFORM
ARG databricks_odbc_driver_url=https://databricks-bi-artifacts.s3.us-east-2.amazonaws.com/simbaspark-drivers/odbc/2.6.26/SimbaSparkODBC-2.6.26.1045-Debian-64bit.zip
RUN if [ "$TARGETPLATFORM" = "linux/amd64" ]; then \
  curl "$databricks_odbc_driver_url" --location --output /tmp/simba_odbc.zip \
  && chmod 600 /tmp/simba_odbc.zip \
  && unzip /tmp/simba_odbc.zip -d /tmp/simba \
  && dpkg -i /tmp/simba/*.deb \
  && printf "[Simba]\nDriver = /opt/simba/spark/lib/64/libsparkodbc_sb64.so" >> /etc/odbcinst.ini \
  && rm /tmp/simba_odbc.zip \
  && rm -rf /tmp/simba; fi

WORKDIR /app

ENV POETRY_VERSION=1.6.1
ENV POETRY_HOME=/etc/poetry
ENV POETRY_VIRTUALENVS_CREATE=false
RUN curl -sSL https://install.python-poetry.org | python3 -

COPY pyproject.toml poetry.lock ./

ARG POETRY_OPTIONS="--no-root --no-interaction --no-ansi"
# for LDAP authentication, install with `ldap3` group
# disabled by default due to GPL license conflict
ARG INSTALL_GROUPS="main,all_ds,dev"
RUN /etc/poetry/bin/poetry install --only $INSTALL_GROUPS $POETRY_OPTIONS

COPY --chown=redash . /app
COPY --from=frontend-builder --chown=redash /frontend/client/dist /app/client/dist
RUN chown redash /app
USER redash

ENTRYPOINT ["/app/bin/docker-entrypoint"]
CMD ["server"]
