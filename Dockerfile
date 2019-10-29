FROM node:10 as frontend-builder

WORKDIR /frontend
COPY package.json package-lock.json /frontend/
RUN npm install

COPY client /frontend/client
COPY webpack.config.js /frontend/
RUN npm run build

FROM python:3.7-slim

EXPOSE 5000

# Controls whether to install extra dependencies needed for all data sources.
ARG skip_ds_deps

RUN useradd --create-home redash

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
  # for SAML
  xmlsec1 \
  # Additional packages required for data sources:
  libssl-dev \
  default-libmysqlclient-dev \
  freetds-dev \
  libsasl2-dev \
  alien \
  gcc \
  unixodbc-dev && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# Install dremio driver
ENV DRIVER_VERSION=1.4.2.1003
RUN wget "https://download.dremio.com/odbc-driver/${DRIVER_VERSION}/dremio-odbc-${DRIVER_VERSION}-1.x86_64.rpm" -O /dremio-odbc-${DRIVER_VERSION}-1.x86_64.rpm
RUN alien -i --scripts /dremio-odbc-${DRIVER_VERSION}-1.x86_64.rpm
RUN rm -f /dremio-odbc-${DRIVER_VERSION}-1.x86_64.rpm

WORKDIR /app

# We first copy only the requirements file, to avoid rebuilding on every file
# change.
COPY requirements.txt requirements_bundles.txt requirements_dev.txt requirements_all_ds.txt ./
RUN pip install -r requirements.txt -r requirements_dev.txt
RUN if [ "x$skip_ds_deps" = "x" ] ; then pip install -r requirements_all_ds.txt ; else echo "Skipping pip install -r requirements_all_ds.txt" ; fi

COPY . /app
COPY --from=frontend-builder /frontend/client/dist /app/client/dist
RUN chown -R redash /app
USER redash

ENTRYPOINT ["/app/bin/docker-entrypoint"]
CMD ["server"]
