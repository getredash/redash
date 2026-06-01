FROM node:24-trixie AS frontend-builder

RUN npm install --global pnpm@10.30.3

# Controls whether to build the frontend assets
ARG skip_frontend_build

ENV CYPRESS_INSTALL_BINARY=0
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=1

RUN useradd -m -d /frontend redash
USER redash

WORKDIR /frontend
COPY --chown=redash package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc /frontend/
COPY --chown=redash viz-lib /frontend/viz-lib
COPY --chown=redash scripts /frontend/scripts

# Controls whether to instrument code for coverage information
ARG code_coverage
ENV BABEL_ENV=${code_coverage:+test}

# Use BuildKit cache mount for pnpm store to speed rebuilds
RUN --mount=type=cache,id=pnpm-store,target=/frontend/.cache/pnpm,uid=1001,gid=1001 \
  pnpm config set store-dir /frontend/.cache/pnpm && \
  if [ "x$skip_frontend_build" = "x" ] ; then pnpm install --frozen-lockfile; fi

COPY --chown=redash client /frontend/client
COPY --chown=redash webpack.config.js /frontend/

# Use the same cache mount for the build step
RUN --mount=type=cache,id=pnpm-store,target=/frontend/.cache/pnpm,uid=1001,gid=1001 <<EOF
  if [ "x$skip_frontend_build" = "x" ]; then
    pnpm run build
  else
    mkdir -p /frontend/client/dist
    touch /frontend/client/dist/multi_org.html
    touch /frontend/client/dist/index.html
  fi
EOF

FROM python:3.13-slim-trixie

EXPOSE 5000

RUN useradd --create-home redash

# Add Debian trixie-security and trixie-updates repositories so we get the latest
# security fixes and stable point updates at build time.
# trixie-proposed-updates is kept for opt-in pre-release fixes already in flight.
RUN set -eux; \
  printf 'deb http://deb.debian.org/debian-security trixie-security main\n' \
    > /etc/apt/sources.list.d/trixie-security.list; \
  printf 'deb http://deb.debian.org/debian trixie-updates main\n' \
    > /etc/apt/sources.list.d/trixie-updates.list; \
  printf 'deb http://deb.debian.org/debian trixie-proposed-updates main\n' \
    > /etc/apt/sources.list.d/trixie-proposed-updates.list

# Apply security archive first (forces -t trixie-security so the security pocket wins),
# then a general upgrade for stable point updates, then install build dependencies.
RUN apt-get update && \
  DEBIAN_FRONTEND=noninteractive apt-get -y -t trixie-security upgrade && \
  DEBIAN_FRONTEND=noninteractive apt-get -y -t trixie-updates upgrade && \
  DEBIAN_FRONTEND=noninteractive apt-get -y upgrade && \
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


ARG TARGETPLATFORM
ARG databricks_odbc_driver_url=https://databricks-bi-artifacts.s3.us-east-2.amazonaws.com/simbaspark-drivers/odbc/2.6.26/SimbaSparkODBC-2.6.26.1045-Debian-64bit.zip
RUN <<EOF
  if [ "$TARGETPLATFORM" = "linux/amd64" ]; then
    curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg
    curl https://packages.microsoft.com/config/debian/13/prod.list > /etc/apt/sources.list.d/mssql-release.list
    apt-get update
    ACCEPT_EULA=Y apt-get install  -y --no-install-recommends msodbcsql18
    apt-get clean
    rm -rf /var/lib/apt/lists/*
    curl "$databricks_odbc_driver_url" --location --output /tmp/simba_odbc.zip
    chmod 600 /tmp/simba_odbc.zip
    unzip /tmp/simba_odbc.zip -d /tmp/simba
    dpkg -i /tmp/simba/*.deb
    printf "[Simba]\nDriver = /opt/simba/spark/lib/64/libsparkodbc_sb64.so" >> /etc/odbcinst.ini
    rm /tmp/simba_odbc.zip
    rm -rf /tmp/simba
  fi
EOF

WORKDIR /app

ENV POETRY_VERSION=2.4.1
ENV POETRY_HOME=/etc/poetry
ENV POETRY_VIRTUALENVS_CREATE=false

RUN python3 -m pip install --no-cache-dir --upgrade "pip>=26.1" "setuptools>=78.1.1" "wheel>=0.46.2" \
  && curl -sSL --retry 3 --retry-delay 5 https://install.python-poetry.org | python3 -

# Avoid crashes, including corrupted cache artifacts, when building multi-platform images with GitHub Actions.
RUN /etc/poetry/bin/poetry cache clear pypi --all

COPY pyproject.toml poetry.lock ./

ARG POETRY_OPTIONS="--no-root --no-interaction --no-ansi"
# for LDAP authentication, install with `ldap3` group
# disabled by default due to GPL license conflict
ARG install_groups="main,all_ds,dev"
RUN /etc/poetry/bin/poetry install --only $install_groups $POETRY_OPTIONS

COPY --chown=redash . /app
COPY --from=frontend-builder --chown=redash /frontend/client/dist /app/client/dist
RUN chown redash /app
USER redash

ENTRYPOINT ["/app/bin/docker-entrypoint"]
CMD ["server"]
